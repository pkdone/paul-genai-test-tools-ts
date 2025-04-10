import { llmConst } from "../types/llm-constants";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelQuality, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse, 
         ModelFamily} 
  from "../types/llm-types";
import { RetryFunc } from "../types/control-types";
import { BadConfigurationLLMError, BadResponseMetadataLLMError, RejectionResponseLLMError } from "../types/llm-errors";
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
  private readonly llmImpl: LLMProviderImpl;
  private readonly llmStats: LLMStats;

  /**
   * Constructor.
   */
  constructor(private readonly llmProviderName: ModelFamily) {
    this.llmImpl = initializeLLMImplementation(llmProviderName);
    this.llmStats = new LLMStats();
    log(`Initiated LLMs from: ${this.llmProviderName}`);
  }

  /**
   * Call close on LLM implementation to release resources.
   */
  async close(): Promise<void> {
    await this.llmImpl.close();
  }

  /**
   * Get the description of models the chosen plug-in provides.
   */
  getModelsUsedDescription() {
    const { embeddings, primary, secondary } = this.llmImpl.getModelsNames();
    return `${this.llmProviderName} (embeddings: ${embeddings}, completions-primary: ${primary}, completions-secondary: ${secondary})`;
  }  


  /**
   * Get the maximum number of tokens for the given model quality. 
   */
  getEmbeddedModelDimensions(): number | undefined {
    return this.llmImpl.getEmbeddedModelDimensions();
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  async generateEmbeddings(resourceName: string, content: string, context: LLMContext = {}): Promise<number[] | null> {
    context.purpose = LLMPurpose.EMBEDDINGS;
    const llmFunc = this.llmImpl.generateEmbeddings.bind(this.llmImpl);
    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(resourceName, content, context, [llmFunc]);

    if (contentResponse !== null && !(Array.isArray(contentResponse) && contentResponse.every(item => typeof item === 'number'))) {
      throw new BadResponseMetadataLLMError("LLM response for embeddings was not an array of numbers", contentResponse);
    }

    return contentResponse;
  }

  /**
   * Send the prompt to the LLM for and retrieve the LLM's answer.
   * 
   * If a particilar LLM quality is not defined, will try to use the primary LLM quality and 
   * failover to the secondary LLM quality if the primary fails.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  async executeCompletion(resourceName: string, prompt: string, asJson = false,
                          context: LLMContext = {},
                          modelQualityOverride: LLMModelQuality | null = null
                         ): Promise<string | object | null> {                            
    const availableModelQualities = modelQualityOverride? [modelQualityOverride] : this.llmImpl.getAvailableCompletionModelQualities();
    const modelQualityCompletionFunctions = this.getModelQualityCompletionFunctions(availableModelQualities);
    context.purpose = LLMPurpose.COMPLETIONS;
    context.modelQuality = availableModelQualities[0];
    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(resourceName, prompt, context, modelQualityCompletionFunctions, asJson);

    // must be string | object
    if ((typeof contentResponse !== 'object') && (typeof contentResponse !== 'string')) {
      throw new BadResponseMetadataLLMError("LLM response for completion was not an object or string", contentResponse);
    }

    return contentResponse;
  }  

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusSummary() {
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusDetails() {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, switching LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(resourceName: string, prompt: string, context: LLMContext, llmFuncs: LLMFunction[], asJson = false): Promise<LLMGeneratedContent> {
    let result: LLMGeneratedContent | null = null;
    let currentPrompt = prompt;
    let llmFuncIndex = 0;

    try {
      // Don't want to increment 'llmFuncIndex' before looping again if going to crop prompt so we can try cropped prompt with same size LLM as last iteration
      while (llmFuncIndex < llmFuncs.length) {
        const llmResponse = await this.executeLLMFuncWithRetries(llmFuncs[llmFuncIndex], currentPrompt, asJson, context);

        if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
          result = llmResponse.generated ?? null;
          this.llmStats.recordSuccess();
          break;
        } else {
          if ((!llmResponse) || (llmResponse.status === LLMResponseStatus.OVERLOADED)) {
            logWithContext(`LLM problem processing prompt for completion with current LLM model because it is overloaded or timing out, even after retries (or a JSON parse error occurred we just wanted to force a retry)`, context);
          } else if (llmResponse.status === LLMResponseStatus.EXCEEDED) {
            logWithContext(`LLM prompt tokens used ${String(llmResponse.tokensUage?.promptTokens ?? 0)} plus completion tokens used ${String(llmResponse.tokensUage?.completionTokens ?? 0)} exceeded EITHER: 1) the model's total token limit of ${String(llmResponse.tokensUage?.maxTotalTokens ?? 0)}, or: 2) the model's completion tokens limit`, context);

            if (llmFuncIndex + 1 >= llmFuncs.length) { 
              if (!llmResponse.tokensUage) throw new BadResponseMetadataLLMError("LLM response indicated token limit exceeded but for some reason `tokensUage` is not present", llmResponse);
              currentPrompt = reducePromptSizeToTokenLimit(currentPrompt, llmResponse.modelKey, llmResponse.tokensUage);
              this.llmStats.recordCrop();
              continue;
            }            
          } else {
            throw new RejectionResponseLLMError(`An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource ''${resourceName}'' - response status received: '${llmResponse.status}'`, llmResponse);
          }

          if (llmFuncIndex + 1 < llmFuncs.length) { 
            context.modelQuality = LLMModelQuality.SECONDARY;
            this.llmStats.recordSwitch();
            llmFuncIndex++;
          }  
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
  private async executeLLMFuncWithRetries(llmFunc: LLMFunction, prompt: string, asJson: boolean, context: LLMContext) {
    const recordRetryFunc = this.llmStats.recordRetry.bind(this.llmStats);
    return await withRetry(
      llmFunc as RetryFunc<LLMFunctionResponse>,
      [prompt, asJson, context],
      result => (result.status === LLMResponseStatus.OVERLOADED),
      recordRetryFunc,
      llmConst.INVOKE_LLM_NUM_ATTEMPTS, llmConst.MIN_RETRY_DELAY_MILLIS,
      llmConst.MAX_RETRY_ADDITIONAL_MILLIS, llmConst.REQUEST_WAIT_TIMEOUT_MILLIS, true
    );
  }

  /**
   * Retrieve the specific LLM's embedding/completion functions to be used based on the desired
   * model qualities.
   */
  private getModelQualityCompletionFunctions(availableModelQualities: LLMModelQuality[]) {
    if (availableModelQualities.length <= 0) throw new BadConfigurationLLMError("No LLM implementation completions models provided");
    return availableModelQualities.map(quality => 
      quality === LLMModelQuality.PRIMARY 
        ? this.llmImpl.executeCompletionPrimary.bind(this.llmImpl)
        : this.llmImpl.executeCompletionSecondary.bind(this.llmImpl)
    );    
  }
}

export default LLMRouter;