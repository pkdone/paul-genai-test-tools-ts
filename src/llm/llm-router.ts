import llmConfig from "../config/llm.config";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelQuality, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse,
         LLMModelMetadata } from "../types/llm-types";
import { RetryFunc } from "../types/control-types";
import { BadConfigurationLLMError, BadResponseMetadataLLMError, RejectionResponseLLMError } from "../types/llm-errors";
import { withRetry } from "../utils/control-utils";
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
  private readonly llmStats: LLMStats;
  private readonly modelsMetadata: Record<string, LLMModelMetadata>;

  /**
   * Constructor.
   * 
   * @param llm The initialized LLM provider implementation
   * @param modelsMetadata Metadata for the LLM models
   */
  constructor(private readonly llm: LLMProviderImpl, modelsMetadata: Record<string, LLMModelMetadata>) {
    this.llmStats = new LLMStats();
    this.modelsMetadata = modelsMetadata;
    log(`Initiated LLMs for: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Call close on LLM implementation to release resources.
   */
  async close(): Promise<void> {
    await this.llm.close();
  }

  /**
   * Get the description of models the chosen plug-in provides.
   */
  getModelsUsedDescription() {
    const [ embeddings, primary, secondary ] = this.llm.getModelsNames();
    return `${this.llm.getModelFamily()} (embeddings: ${embeddings}, completions-primary: ${primary}, completions-secondary: ${secondary})`;
  }  


  /**
   * Get the maximum number of tokens for the given model quality. 
   */
  getEmbeddedModelDimensions(): number | undefined {
    return this.llm.getEmbeddedModelDimensions();
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  async generateEmbeddings(resourceName: string, content: string, context: LLMContext = {}): Promise<number[] | null> {
    context.purpose = LLMPurpose.EMBEDDINGS;
    const llmFunc = this.llm.generateEmbeddings.bind(this.llm);
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
    const availableModelQualities = modelQualityOverride? [modelQualityOverride] : this.llm.getAvailableCompletionModelQualities();
    const modelQualityCompletionFunctions = this.getModelQualityCompletionFunctions(availableModelQualities);
    context.purpose = LLMPurpose.COMPLETIONS;
    context.modelQuality = availableModelQualities[0];
    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(resourceName, prompt, context, modelQualityCompletionFunctions, asJson);

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
      // Don't want to increment 'llmFuncIndex' before looping again, if going to crop prompt (to enable us to try cropped prompt with same size LLM as last iteration)
      while (llmFuncIndex < llmFuncs.length) {
        const llmResponse = await this.executeLLMFuncWithRetries(llmFuncs[llmFuncIndex], currentPrompt, asJson, context);

        if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
          result = llmResponse.generated ?? null;
          this.llmStats.recordSuccess();
          break;
        } else {
          const isOverloaded = (!llmResponse) || (llmResponse.status === LLMResponseStatus.OVERLOADED);
          const isExceeded = llmResponse?.status === LLMResponseStatus.EXCEEDED;
          const canSwitchModel = llmFuncIndex + 1 < llmFuncs.length;

          if (isOverloaded) {
            logWithContext(`LLM problem processing prompt for completion with current LLM model because it is overloaded or timing out, even after retries (or a JSON parse error occurred we just wanted to force a retry)`, context);
            if (!canSwitchModel) break;
          } else if (isExceeded) {
            logWithContext(`LLM prompt tokens used ${llmResponse.tokensUage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`, context);

            if (!canSwitchModel) {
              if (!llmResponse.tokensUage) throw new BadResponseMetadataLLMError("LLM response indicated token limit exceeded but for some reason `tokensUage` is not present", llmResponse);
              currentPrompt = reducePromptSizeToTokenLimit(currentPrompt, llmResponse.modelKey, llmResponse.tokensUage, this.modelsMetadata);
              this.llmStats.recordCrop();
              continue;
            }
          } else {
            throw new RejectionResponseLLMError(`An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource ''${resourceName}'' - response status received: '${llmResponse.status}'`, llmResponse);
          }

          context.modelQuality = LLMModelQuality.SECONDARY;
          this.llmStats.recordSwitch();
          llmFuncIndex++;
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
      llmConfig.INVOKE_LLM_NUM_ATTEMPTS, llmConfig.MIN_RETRY_DELAY_MILLIS,
      llmConfig.MAX_RETRY_ADDITIONAL_MILLIS, llmConfig.REQUEST_WAIT_TIMEOUT_MILLIS, true
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
        ? this.llm.executeCompletionPrimary.bind(this.llm)
        : this.llm.executeCompletionSecondary.bind(this.llm)
    );    
  }
}

export default LLMRouter;