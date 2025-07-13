import { llmConfig } from "../llm.config";
import {
  LLMContext,
  LLMFunction,
  LLMModelQuality,
  LLMPurpose,
  LLMResponseStatus,
  LLMGeneratedContent,
  LLMFunctionResponse,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  LLMOutputFormat,
} from "../llm.types";
import type { LLMProviderImpl, LLMCandidateFunction } from "../llm.types";
import { RetryFunc } from "../../common/control/control.types";
import { BadConfigurationLLMError, BadResponseContentLLMError } from "../errors/llm-errors.types";
import { withRetry } from "../../common/control/control-utils";
import type { PromptAdapter } from "../utils/prompting/prompt-adapter";
import { log, logErrWithContext, logWithContext } from "../utils/routerTracking/llm-router-logging";
import type LLMStats from "../utils/routerTracking/llm-stats";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { LLMService } from "./llm-service";
import type { EnvVars } from "../../lifecycle/env.types";
import { 
  handleUnsuccessfulLLMCallOutcome,
  validateAndReturnStructuredResponse
} from "../utils/responseProcessing/llm-response-tools";
import {
  getCompletionCandidates,
  buildCompletionCandidates,
} from "../utils/requestProcessing/llm-request-tools";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
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
    private readonly llmService: LLMService,
    private readonly envVars: EnvVars,
    private readonly llmStats: LLMStats,
    private readonly promptAdapter: PromptAdapter,
  ) {
    this.llm = this.llmService.getLLMProvider(this.envVars);
    this.modelsMetadata = this.llm.getModelsMetadata();
    const llmManifest = this.llmService.getLLMManifest();
    this.retryConfig = llmManifest.providerSpecificConfig ?? {};
    this.completionCandidates = buildCompletionCandidates(this.llm);

    if (this.completionCandidates.length === 0) {
      throw new BadConfigurationLLMError(
        "At least one completion candidate function must be provided",
      );
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
    const [embeddings, primaryCompletion, secondaryCompletion] = this.llm.getModelsNames();
    const candidateDescriptions = this.completionCandidates
      .map((candidate) => {
        const modelId =
          candidate.modelQuality === LLMModelQuality.PRIMARY
            ? primaryCompletion
            : secondaryCompletion;
        return `${candidate.modelQuality}: ${modelId}`;
      })
      .join(", ");
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
   */
  async generateEmbeddings(resourceName: string, content: string): Promise<number[] | null> {
    // Construct context internally using available information
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };

    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(
      resourceName,
      content,
      context,
      [this.llm.generateEmbeddings.bind(this.llm)],
    );

    if (contentResponse === null) return null;

    if (
      !(Array.isArray(contentResponse) && contentResponse.every((item) => typeof item === "number"))
    ) {
      logErrWithContext(
        new BadResponseContentLLMError("LLM response for embeddings was not an array of numbers"),
        context,
      );
      return null;
    }

    return contentResponse;
  }

  /**
   * Send the prompt to the LLM for and retrieve the LLM's answer.
   *
   * When options.jsonSchema is provided, this method will:
   * - Use native JSON mode capabilities where available
   * - Fall back to text parsing for providers that don't support structured output
   * - Validate the response against the provided Zod schema
   * - Return the validated, typed result
   *
   * If a particular LLM quality is not specified, will try to use the completion candidates
   * in the order they were configured during construction.
   */
  async executeCompletion<T = LLMGeneratedContent>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions,
    modelQualityOverride: LLMModelQuality | null = null,
  ): Promise<T | null> {
    const { candidatesToUse, candidateFunctions } = getCompletionCandidates(
      this.completionCandidates,
      modelQualityOverride,
    );
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.COMPLETIONS,
      modelQuality: candidatesToUse[0].modelQuality,
      outputFormat: options.outputFormat,
    };
    const llmResponse = await this.invokeLLMWithRetriesAndAdaptation(
      resourceName,
      prompt,
      context,
      candidateFunctions,
      candidatesToUse,
      options,
    );

    if (options.outputFormat === LLMOutputFormat.JSON) {
      return validateAndReturnStructuredResponse<T>(resourceName, llmResponse, options);
    } else {
      return llmResponse as T | null;
    }
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
   * Crops the prompt to fit within token limits when the current LLM exceeds capacity.
   */
  private cropPromptForTokenLimit(currentPrompt: string, llmResponse: LLMFunctionResponse): string {
    this.llmStats.recordCrop();
    return this.promptAdapter.adaptPromptFromResponse(
      currentPrompt,
      llmResponse,
      this.modelsMetadata,
    );
  }



  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, switching LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(
    resourceName: string,
    prompt: string,
    context: LLMContext,
    llmFuncs: LLMFunction[],
    candidates?: LLMCandidateFunction[],
    options?: LLMCompletionOptions,
  ) {
    let result: LLMGeneratedContent | null = null;
    const currentPrompt = prompt;

    try {
      result = await this.iterateOverLLMFunctions(
        resourceName,
        currentPrompt,
        context,
        llmFuncs,
        candidates,
        options,
      );

      if (!result) {
        log(
          `Given-up on trying to fulfill the current prompt with an LLM for the following resource: '${resourceName}'`,
        );
        this.llmStats.recordFailure();
      }
    } catch (error: unknown) {
      log(
        `Unable to process the following resource with an LLM due to a non-recoverable error for the following resource: '${resourceName}'`,
      );
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
    candidates?: LLMCandidateFunction[],
    options?: LLMCompletionOptions,
  ): Promise<LLMGeneratedContent | null> {
    let currentPrompt = initialPrompt;
    let llmFuncIndex = 0;

    // Don't want to increment 'llmFuncIndex' before looping again, if going to crop prompt
    // (to enable us to try cropped prompt with same size LLM as last iteration)
    while (llmFuncIndex < llmFuncs.length) {
      const llmResponse = await this.executeLLMFuncWithRetries(
        llmFuncs[llmFuncIndex],
        currentPrompt,
        context,
        options,
      );

      if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
        this.llmStats.recordSuccess();
        return llmResponse.generated ?? null;
      } else if (llmResponse?.status === LLMResponseStatus.ERRORED) {
        logErrWithContext(llmResponse.error, context);
        return null;
      }

      const nextAction = handleUnsuccessfulLLMCallOutcome(
        llmResponse,
        llmFuncIndex,
        llmFuncs.length,
        context,
        resourceName,
      );
      if (nextAction.shouldTerminate) break;

      if (nextAction.shouldCropPrompt && llmResponse) {
        currentPrompt = this.cropPromptForTokenLimit(currentPrompt, llmResponse);

        if (currentPrompt.trim() === "") {
          logWithContext(
            `Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`,
            context,
          );
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
   * Send a prompt to an LLM for completion, retrying a number of times if the LLM is overloaded.
   */
  private async executeLLMFuncWithRetries(
    llmFunc: LLMFunction,
    prompt: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ) {
    const recordRetryFunc = this.llmStats.recordRetry.bind(this.llmStats);
    const retryConfig = this.getRetryConfiguration();

    const result = await withRetry(
      llmFunc as RetryFunc<[string, LLMContext, LLMCompletionOptions?], LLMFunctionResponse>,
      [prompt, context, options],
      (result: LLMFunctionResponse) => result.status === LLMResponseStatus.OVERLOADED,
      recordRetryFunc,
      retryConfig.maxAttempts,
      retryConfig.minRetryDelayMillis,
    );

    return result;
  }

  /**
   * Get retry configuration from provider-specific config with fallbacks to global config.
   */
  private getRetryConfiguration() {
    return {
      maxAttempts: this.retryConfig.maxRetryAttempts ?? llmConfig.DEFAULT_INVOKE_LLM_NUM_ATTEMPTS,
      minRetryDelayMillis:
        this.retryConfig.minRetryDelayMillis ?? llmConfig.DEFAULT_MIN_RETRY_DELAY_MILLIS,
      maxRetryAdditionalDelayMillis:
        this.retryConfig.maxRetryAdditionalDelayMillis ??
        llmConfig.DEFAULT_MAX_RETRY_ADDITIONAL_MILLIS,
      requestTimeoutMillis:
        this.retryConfig.requestTimeoutMillis ?? llmConfig.DEFAULT_REQUEST_WAIT_TIMEOUT_MILLIS,
    };
  }
}
