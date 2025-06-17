import { llmConfig } from "../config";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelQuality, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse,
         ResolvedLLMModelMetadata } from "../types/llm.types";
import { RetryFunc } from "../types/control.types";
import { BadConfigurationLLMError, BadResponseMetadataLLMError, RejectionResponseLLMError } from "../types/llm-errors.types";
import { withRetry } from "../utils/control-utils";
import { PromptAdapter } from "./responseProcessing/llm-prompt-adapter";
import { log, logErrWithContext, logWithContext } from "./routerTracking/llm-router-logging";
import LLMStats from "./routerTracking/llm-stats";
import { LLMRetryConfig } from "./providers/llm-provider.types";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization / 
 * completion function:
 * 
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
export default class LLMRouter {
  // Private fields
  private readonly llmStats: LLMStats;
  private readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  private readonly promptAdapter: PromptAdapter;

  /**
   * Constructor.
   * 
   * @param llm The initialized LLM provider implementation
   * @param retryConfig Provider-specific retry and timeout configuration
   */
  constructor(
    private readonly llm: LLMProviderImpl,
    private readonly retryConfig: LLMRetryConfig = {}
  ) {
    this.llmStats = new LLMStats();
    this.modelsMetadata = llm.getModelsMetadata();
    this.promptAdapter = new PromptAdapter();
    log(`Initiated LLMs for: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Call close on LLM implementation to release resources.
   */
  async close(): Promise<void> {
    await this.llm.close();
  }

  /**
   * Get the model family of the LLM implementation.
   */
  getModelFamily(): string {
    return this.llm.getModelFamily();
  }

  /**
   * Get the description of models the chosen plug-in provides.
   */
  getModelsUsedDescription(): string {
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
    const llmFunc = this.llm.generateEmbeddings;
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
                         ): Promise<LLMGeneratedContent | null> {                            
    const availableModelQualities = modelQualityOverride? [modelQualityOverride] : this.llm.getAvailableCompletionModelQualities();
    if (availableModelQualities.length === 0) throw new BadConfigurationLLMError("No available completion model qualities found for the provider.");
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
  displayLLMStatusSummary(): void {
    console.log("LLM inovocation event types that will be recorded:");
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusDetails(): void {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, switching LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(resourceName: string, prompt: string, context: LLMContext, llmFuncs: LLMFunction[], asJson = false) {
    let result: LLMGeneratedContent | null = null;
    const currentPrompt = prompt;

    try {
      result = await this.iterateOverLLMFunctions(resourceName, currentPrompt, context, llmFuncs, asJson);

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
   * Iterates through available LLM functions, attempting each until successful completion
   * or all options are exhausted.
   */
  private async iterateOverLLMFunctions(
    resourceName: string, 
    initialPrompt: string, 
    context: LLMContext, 
    llmFuncs: LLMFunction[], 
    asJson: boolean
  ): Promise<LLMGeneratedContent | null> {
    let currentPrompt = initialPrompt;
    let llmFuncIndex = 0;

    // Don't want to increment 'llmFuncIndex' before looping again, if going to crop prompt 
    // (to enable us to try cropped prompt with same size LLM as last iteration)
    while (llmFuncIndex < llmFuncs.length) {
      const llmResponse = await this.executeLLMFuncWithRetries(llmFuncs[llmFuncIndex], currentPrompt, asJson, context);

      if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
        this.llmStats.recordSuccess();
        return llmResponse.generated ?? null;
      }

      const nextAction = this.handleUnsuccessfulLLMCallOutcome(llmResponse, llmFuncIndex, llmFuncs.length, context, resourceName);
      if (nextAction.shouldTerminate) break;
      
      if (nextAction.shouldCropPrompt && llmResponse) {
        currentPrompt = this.cropPromptForTokenLimit(currentPrompt, llmResponse);

        if (currentPrompt.trim() === "") {
          logWithContext(`Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`, context);
          break; 
        }

        continue; // Try again with same LLM function but cropped prompt
      }
      
      if (nextAction.shouldSwitchToNextLLM) {
        context.modelQuality = LLMModelQuality.SECONDARY;
        this.llmStats.recordSwitch();
        llmFuncIndex++;
      }
    }

    return null;
  }

  /**
   * Handles the outcome of an LLM call and determines the next action to take.
   */
  private handleUnsuccessfulLLMCallOutcome(
    llmResponse: LLMFunctionResponse | null, 
    currentLLMIndex: number, 
    totalLLMCount: number, 
    context: LLMContext,
    resourceName: string
  ): { shouldTerminate: boolean; shouldCropPrompt: boolean; shouldSwitchToNextLLM: boolean } {
    const isOverloaded = (!llmResponse) || (llmResponse.status === LLMResponseStatus.OVERLOADED);
    const isExceeded = llmResponse?.status === LLMResponseStatus.EXCEEDED;
    const canSwitchModel = currentLLMIndex + 1 < totalLLMCount;

    if (isOverloaded) {
      logWithContext(`LLM problem processing prompt for completion with current LLM model because it is overloaded or timing out, even after retries (or a JSON parse error occurred we just wanted to force a retry)`, context);
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel
      };
    } else if (isExceeded) {
      logWithContext(`LLM prompt tokens used ${llmResponse.tokensUage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`, context);      
      return {
        shouldTerminate: false,
        shouldCropPrompt: !canSwitchModel,
        shouldSwitchToNextLLM: canSwitchModel
      };
    } else {
      throw new RejectionResponseLLMError(`An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource '${resourceName}' - response status received: '${llmResponse.status}'`, llmResponse);
    }
  }

  /**
   * Crops the prompt to fit within token limits when the current LLM exceeds capacity.
   */
  private cropPromptForTokenLimit(currentPrompt: string, llmResponse: LLMFunctionResponse): string {
    this.llmStats.recordCrop();
    return this.promptAdapter.adaptPromptFromResponse(currentPrompt, llmResponse, this.modelsMetadata);
  }

  /**
   * Send a prompt to an LLM for completion, retrying a number of times if the LLM is overloaded. 
   */
  private async executeLLMFuncWithRetries(llmFunc: LLMFunction, prompt: string, asJson: boolean, context: LLMContext) {
    const recordRetryFunc = this.llmStats.recordRetry.bind(this.llmStats);
    const retryConfig = this.getRetryConfiguration();
    
    return await withRetry(
      llmFunc as RetryFunc<LLMFunctionResponse>,
      [prompt, asJson, context],
      result => (result.status === LLMResponseStatus.OVERLOADED),
      recordRetryFunc,
      retryConfig.maxAttempts,
      retryConfig.minRetryDelayMillis,
      retryConfig.maxRetryAdditionalDelayMillis,
      retryConfig.requestTimeoutMillis,
      true
    );
  }

  /**
   * Get retry configuration from provider-specific config with fallbacks to global config.
   */
  private getRetryConfiguration() {
    return {
      maxAttempts: this.retryConfig.maxRetryAttempts ?? llmConfig.DEFAULT_INVOKE_LLM_NUM_ATTEMPTS,
      minRetryDelayMillis: this.retryConfig.minRetryDelayMillis ?? llmConfig.DEFAULT_MIN_RETRY_DELAY_MILLIS,
      maxRetryAdditionalDelayMillis: this.retryConfig.maxRetryAdditionalDelayMillis ?? llmConfig.DEFAULT_MAX_RETRY_ADDITIONAL_MILLIS,
      requestTimeoutMillis: this.retryConfig.requestTimeoutMillis ?? llmConfig.DEFAULT_REQUEST_WAIT_TIMEOUT_MILLIS,
    };
  }

  /**
   * Retrieve the specific LLM's embedding/completion functions to be used based on the desired
   * model qualities.
   */
  private getModelQualityCompletionFunctions(availableModelQualities: LLMModelQuality[]) {
    if (availableModelQualities.length <= 0) throw new BadConfigurationLLMError("No LLM implementation completions models provided");
    return availableModelQualities.map(quality => 
      quality === LLMModelQuality.PRIMARY 
        ? this.llm.executeCompletionPrimary
        : this.llm.executeCompletionSecondary
    );    
  }
}