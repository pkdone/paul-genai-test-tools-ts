import { injectable, inject } from "tsyringe";
import { llmConfig } from "./llm.config";
import { LLMContext, LLMFunction, LLMModelQuality, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse,
         ResolvedLLMModelMetadata } from "./llm.types";
import type { LLMProviderImpl, LLMCandidateFunction } from "./llm.types";
import { RetryFunc } from "../control/control.types";
import { BadConfigurationLLMError, BadResponseMetadataLLMError, RejectionResponseLLMError } from "./common/llm-errors.types";
import { withRetry } from "../control/control-utils";
import type { PromptAdapter } from "./common/responseProcessing/llm-prompt-adapter";
import { log, logErrWithContext, logWithContext } from "./common/routerTracking/llm-router-logging";
import type LLMStats from "./common/routerTracking/llm-stats";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import { LLMService } from "./llm-service";
import type { EnvVars } from "../../app/env.types";
import { TOKENS } from "../../di/tokens";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization / 
 * completion function:
 * 
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
@injectable()
export default class LLMRouter {
  // Private fields
  private readonly llm: LLMProviderImpl;
  private readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly retryConfig: LLMRetryConfig;

  /**
   * Constructor.
   * 
   * @param llmService The LLM service for provider management
   * @param envVars Environment variables
   * @param llmStats The LLM statistics tracker
   * @param promptAdapter The prompt adapter for handling token limits
   */
  constructor(
    @inject(TOKENS.LLMService) private readonly llmService: LLMService,
    @inject(TOKENS.EnvVars) private readonly envVars: EnvVars,
    @inject(TOKENS.LLMStats) private readonly llmStats: LLMStats,
    @inject(TOKENS.PromptAdapter) private readonly promptAdapter: PromptAdapter
  ) {
    // Derive the LLM provider and related configuration from the service
    this.llm = this.llmService.getLLMProvider(this.envVars);
    this.modelsMetadata = this.llm.getModelsMetadata();
    
    // Get the retry configuration from the manifest
    const llmManifest = this.llmService.getLLMManifest();
    this.retryConfig = llmManifest.providerSpecificConfig ?? {};
    
    // Configure completion candidates in order of preference
    this.completionCandidates = this.buildCompletionCandidates();
    
    if (this.completionCandidates.length === 0) {
      throw new BadConfigurationLLMError("At least one completion candidate function must be provided");
    }
    
    log(`Router LLMs to be used: ${this.getModelsUsedDescription()}`);
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
    const [ embeddings ] = this.llm.getModelsNames();
    const candidateDescriptions = this.completionCandidates
      .map(candidate => `${candidate.modelQuality}: ${candidate.description}`)
      .join(', ');
    return `${this.llm.getModelFamily()} (embeddings: ${embeddings}, completions: ${candidateDescriptions})`;
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
    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(resourceName, content, context, [this.llm.generateEmbeddings.bind(this.llm)]);

    if (contentResponse !== null && !(Array.isArray(contentResponse) && contentResponse.every(item => typeof item === 'number'))) {
      throw new BadResponseMetadataLLMError("LLM response for embeddings was not an array of numbers", contentResponse);
    }

    return contentResponse;
  }

  /**
   * Send the prompt to the LLM for and retrieve the LLM's answer.
   * 
   * If a particular LLM quality is not specified, will try to use the completion candidates
   * in the order they were configured during construction.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  async executeCompletion(resourceName: string, prompt: string, asJson = false,
                          context: LLMContext = {},
                          modelQualityOverride: LLMModelQuality | null = null
                         ): Promise<LLMGeneratedContent | null> {                            
    // Filter candidates based on model quality override if specified
    const candidatesToUse = modelQualityOverride 
      ? this.completionCandidates.filter(candidate => candidate.modelQuality === modelQualityOverride)
      : this.completionCandidates;
    
    if (candidatesToUse.length === 0) {
      throw new BadConfigurationLLMError(
        modelQualityOverride 
          ? `No completion candidates found for model quality: ${modelQualityOverride}`
          : "No completion candidates available"
      );
    }
    
    const candidateFunctions = candidatesToUse.map(candidate => candidate.func);
    context.purpose = LLMPurpose.COMPLETIONS;
    context.modelQuality = candidatesToUse[0].modelQuality;
    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(resourceName, prompt, context, candidateFunctions, asJson, candidatesToUse);

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
   * Build completion candidates from the LLM provider.
   */
  private buildCompletionCandidates(): LLMCandidateFunction[] {
    const candidates: LLMCandidateFunction[] = [];
    
    // Add primary completion model as first candidate
    candidates.push({
      func: this.llm.executeCompletionPrimary.bind(this.llm),
      modelQuality: LLMModelQuality.PRIMARY,
      description: "Primary completion model"
    });
    
    // Add secondary completion model as fallback if available
    const availableQualities = this.llm.getAvailableCompletionModelQualities();
    if (availableQualities.includes(LLMModelQuality.SECONDARY)) {
      candidates.push({
        func: this.llm.executeCompletionSecondary.bind(this.llm),
        modelQuality: LLMModelQuality.SECONDARY,
        description: "Secondary completion model (fallback)"
      });
    }
    
    return candidates;
  }

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, switching LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(resourceName: string, prompt: string, context: LLMContext, llmFuncs: LLMFunction[], asJson = false, candidates?: LLMCandidateFunction[]) {
    let result: LLMGeneratedContent | null = null;
    const currentPrompt = prompt;

    try {
      result = await this.iterateOverLLMFunctions(resourceName, currentPrompt, context, llmFuncs, asJson, candidates);

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
    asJson: boolean,
    candidates?: LLMCandidateFunction[]
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
        if (candidates && llmFuncIndex + 1 < candidates.length) {
          context.modelQuality = candidates[llmFuncIndex + 1].modelQuality;
        }
        
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
    
    const result = await withRetry(
      llmFunc as RetryFunc<[string, boolean, LLMContext], LLMFunctionResponse>,
      [prompt, asJson, context],
      (result: LLMFunctionResponse) => result.status === LLMResponseStatus.OVERLOADED,
      recordRetryFunc,
      retryConfig.maxAttempts,
      retryConfig.minRetryDelayMillis
    );

    return result;
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
}