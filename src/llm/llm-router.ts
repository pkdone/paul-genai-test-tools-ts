import { llmConst } from "../types/llm-constants";
import envConst from "../types/env-constants";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelQuality, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse } 
  from "../types/llm-types";
import { RetryFunc } from "../types/control-types";
import { BadConfigurationLLMError, BadResponseMetadataLLMError, RejectionResponseLLMError } from "../types/llm-exceptions";
import { getEnvVar } from "../utils/envvar-utils";
import { withRetry } from "../utils/control-utils";
import { initializeLLMImplementation  } from "./llm-initializer";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";
import { log, logErrWithContext, logWithContext } from "./llm-router-logging";
import LLMStats from "./llm-stats";


/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization / 
 * completion function:
 * 
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
class LLMRouter {
  // Private fields
  private readonly llmProviderName: string;
  private readonly llmImpl: LLMProviderImpl;
  private readonly llmStats: LLMStats;
  private readonly usePremiumLModelOnly: boolean;
  private readonly loggedMissingModelWarning: { [key: string]: boolean } = { regular: false, premium: false };


  /**
   * Constructor.
   */
  constructor(llmProviderName: string, doLogLLMInvocationEvents: boolean) {
    this.llmProviderName = llmProviderName;
    this.llmImpl = initializeLLMImplementation(llmProviderName);
    this.llmStats = new LLMStats(doLogLLMInvocationEvents);
    this.usePremiumLModelOnly = getEnvVar<boolean>(envConst.ENV_LLM_USE_PREMIUM_ONLY, false);
    log(`Initiated LLMs from: ${this.llmProviderName}`);
  }


  /**
   * Call close on LLM implementation to release resources.
   */
  public async close(): Promise<void> {
    await this.llmImpl.close();
  }


  /**
   * Get the description of models the chosen plug-in provides.
   */
  public getModelsUsedDescription(): string {
    const { embeddings, regular, premium } = this.llmImpl.getModelsNames();
    return `${this.llmProviderName} (embeddings: ${embeddings}, completions-regular: ${regular}, completions-premium: ${premium})`;
  }  


  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async generateEmbeddings(resourceName: string, content: string, context: LLMContext = {}): Promise<LLMGeneratedContent> {
    context.purpose = LLMPurpose.EMBEDDINGS;
    const llmFunc = this.llmImpl.generateEmbeddings.bind(this.llmImpl);
    return await this.invokeLLMWithRetriesAndAdaptation(resourceName, content, context, [llmFunc]);
  }


  /**
   * Send the prompt to the LLM for a particular model quality and retrieve the LLM's answer.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async executeCompletion(resourceName: string, prompt: string, startingModelQuality: LLMModelQuality, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMGeneratedContent> {
    context.purpose = LLMPurpose.COMPLETIONS;
    const modelQualitiesSupported = this.llmImpl.getAvailableCompletionModelQualities();
    startingModelQuality = this.adjustStartingModelQualityBasedOnAvailability(modelQualitiesSupported, startingModelQuality);
    context.modelQuality = (startingModelQuality === LLMModelQuality.REGULAR_PLUS) ? LLMModelQuality.REGULAR : startingModelQuality;
    return this.invokeLLMWithRetriesAndAdaptation(resourceName, prompt, context, this.getModelQualityCompletionFunctions(startingModelQuality), doReturnJSON);
  }  


  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, stepping up LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(resourceName: string, prompt: string, context: LLMContext, llmFuncs: LLMFunction[],
                                                  doReturnJSON: boolean = false): Promise<LLMGeneratedContent> {
    let result: LLMGeneratedContent | null = null;
    let currentPrompt = prompt;
    let llmFuncIndex = 0;

    try {
      // Don't want to increment 'llmFuncIndex' before looping again if going to crop prompt to try cropped prompt with same size LLM as last iteration
      while (llmFuncIndex < llmFuncs.length) {
        let llmResponse = await this.executeLLMFuncWithRetries(llmFuncs[llmFuncIndex], currentPrompt, doReturnJSON, context);

        if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
          result = llmResponse.generated || null;
          this.llmStats.recordSuccess();
          break;
        } else if ((!llmResponse) || (llmResponse.status === LLMResponseStatus.OVERLOADED)) {
          logWithContext(`LLM problem processing prompt for completion with current LLM model because it is overloaded or timing out, even after retries`, context);
          break;
        } else if (llmResponse.status === LLMResponseStatus.EXCEEDED) {
          logWithContext(`LLM prompt tokens used ${llmResponse.tokensUage?.promptTokens} plus completion tokens used ${llmResponse.tokensUage?.completionTokens} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUage?.maxTotalTokens}, or: 2) the model's completion tokens limit`, context);

          if (llmFuncIndex + 1 >= llmFuncs.length) { 
            if (!llmResponse.tokensUage) throw new BadResponseMetadataLLMError("LLM response indicated token limit exceeded but for some reason `tokensUage` is not present", llmResponse);
            currentPrompt = reducePromptSizeToTokenLimit(currentPrompt, llmResponse.modelKey, llmResponse.tokensUage);
            this.llmStats.recordCrop();
          } else {
            context.modelQuality = LLMModelQuality.PREMIUM;
            this.llmStats.recordStepUp();
            llmFuncIndex++;
          }  
        } else {
          throw new RejectionResponseLLMError(`An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource ''${resourceName}'' - response status received: '${llmResponse?.status}'`, llmResponse);
        }
      }

      if (!result) {
        log(`Given-up on trying to process the following resource with an LLM: '${resourceName}'`);
        this.llmStats.recordFailure();
      }
    } catch (error: unknown) {
      log(`Unable to process the following resource with an LLM due to a non-recoverable error: '${resourceName}'`);
      logErrWithContext(error, context);
      this.llmStats.recordFailure();
    }

    return result;
  } 


  /**
   * Send a prompt to an LLM for completion, retrying a number of times if the LLM is overloaded. 
   */
  private async executeLLMFuncWithRetries(llmFunc: LLMFunction, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse | null> {
    const recordRetryFunc = this.llmStats.recordRetry.bind(this.llmStats);
    return await withRetry(
      llmFunc as RetryFunc<LLMFunctionResponse>,
      [prompt, doReturnJSON, context],
      result => (result?.status === LLMResponseStatus.OVERLOADED),
      recordRetryFunc,
      llmConst.INVOKE_LLM_NUM_ATTEMPTS, llmConst.MIN_RETRY_DELAY_MILLIS,
      llmConst.MAX_RETRY_ADDITIONAL_MILLIS, llmConst.REQUEST_WAIT_TIMEOUT_MILLIS, true
    );
  }


  /**
   * Retrieve the specific LLM's embedding/completion functions to be used based on the desired
   * model quality.
   */
  private getModelQualityCompletionFunctions(modelQuality: LLMModelQuality): LLMFunction[] {
    const modelFuncs = [];
    
    if ([LLMModelQuality.REGULAR, LLMModelQuality.REGULAR_PLUS].includes(modelQuality)) { 
      modelFuncs.push(this.llmImpl.executeCompletionRegular.bind(this.llmImpl));
    }

    if ([LLMModelQuality.PREMIUM, LLMModelQuality.REGULAR_PLUS].includes(modelQuality)) { 
      modelFuncs.push(this.llmImpl.executeCompletionPremium.bind(this.llmImpl));
    }

    return modelFuncs;
  }


  /**
   * Adjust the starting model quality used based on availability and log warnings if necessary.
   */
  private adjustStartingModelQualityBasedOnAvailability(invocableModelQualitiesAvailable: LLMModelQuality[], startingModelQuality: LLMModelQuality): LLMModelQuality {
    let currentStartingModelQuality: LLMModelQuality | null = startingModelQuality;

    if (!invocableModelQualitiesAvailable || invocableModelQualitiesAvailable.length <= 0) {
      throw new BadConfigurationLLMError("The LLM implementation doesn't implement any completions models");
    }

    if (this.usePremiumLModelOnly) currentStartingModelQuality = LLMModelQuality.PREMIUM;

    currentStartingModelQuality = this.adjustCategoryOfModelQualityIfNeededLoggingIssue(
      [LLMModelQuality.REGULAR, LLMModelQuality.REGULAR_PLUS], 
      currentStartingModelQuality, 
      invocableModelQualitiesAvailable, 
      LLMModelQuality.REGULAR,
      llmConst.REGULAR_MODEL_QUALITY_NAME, 
      LLMModelQuality.PREMIUM,
      llmConst.PREMIUM_MODEL_QUALITY_NAME);

      currentStartingModelQuality = this.adjustCategoryOfModelQualityIfNeededLoggingIssue(
      [LLMModelQuality.PREMIUM, LLMModelQuality.REGULAR_PLUS], 
      currentStartingModelQuality, 
      invocableModelQualitiesAvailable, 
      LLMModelQuality.PREMIUM,
      llmConst.PREMIUM_MODEL_QUALITY_NAME, 
      this.usePremiumLModelOnly ? null : LLMModelQuality.REGULAR,
      this.usePremiumLModelOnly ? "<none>" : llmConst.REGULAR_MODEL_QUALITY_NAME);

    if (currentStartingModelQuality) {
      return currentStartingModelQuality;
    } else if (this.usePremiumLModelOnly) {
      throw new BadConfigurationLLMError("Configured preference `PREMIUM_LLM_ONLY` was set to true, but a premium model is not available, so can't continue");
    } else {
      throw new BadConfigurationLLMError("Neither a regular or premium model is available to use, so can't continue");
    }
  }


  /**
   * Adjust the model quality used based on availability and log warning if necessary.
   */
  private adjustCategoryOfModelQualityIfNeededLoggingIssue(categoryOfModelQualityOptions: LLMModelQuality[], startingModelQuality: LLMModelQuality | null, invocableModelQualitiesAvailable: LLMModelQuality[], targetModelQuality: LLMModelQuality, targetModelQualityName: string, fallbackModelQuality: LLMModelQuality | null, fallbackModelQualityName: string) {
    let resolvedStartingModelQuality: LLMModelQuality | null = startingModelQuality;

    if (resolvedStartingModelQuality && categoryOfModelQualityOptions.includes(resolvedStartingModelQuality)) {
      if (!invocableModelQualitiesAvailable.includes(targetModelQuality)) {
        if (!this.loggedMissingModelWarning[targetModelQualityName]) {
          log(`WARNING: Requested LLM completion model type of '${targetModelQualityName}' does not exist, so will only attempt to use '${fallbackModelQualityName}' model`);
          this.loggedMissingModelWarning[targetModelQualityName] = true;
        }

        resolvedStartingModelQuality = fallbackModelQuality;
      }
    }

    return resolvedStartingModelQuality;
  }


  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  public displayLLMStatusSummary(): void {
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }


  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  public displayLLMStatusDetails(): void {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }
}


export default LLMRouter;