import {
  LLMModelQuality,
  LLMContext,
  LLMPurpose,
  LLMProviderImpl,
  LLMResponseStatus,
  LLMModelKeysSet,
  LLMFunctionResponse,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMCompletionOptions,
  LLMResponseTokensUsage,
  LLMGeneratedContent,
  LLMOutputFormat,
} from "../llm.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
} from "../providers/llm-provider.types";
import { getErrorText } from "../../common/utils/error-utils";
import { convertTextToJSONAndOptionallyValidate } from "../processing/msgProcessing/llm-response-tools";
import { extractTokensAmountAndLimitFromErrorMsg } from "../processing/msgProcessing/response-error-pattern-parser";
import { BadConfigurationLLMError } from "../errors/llm-errors.types";

/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
export default abstract class AbstractLLM implements LLMProviderImpl {
  // Fields
  protected readonly llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  protected readonly providerSpecificConfig: LLMProviderSpecificConfig;
  private readonly modelsKeys: LLMModelKeysSet;
  private readonly errorPatterns: readonly LLMErrorMsgRegExPattern[];

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    providerSpecificConfig: LLMProviderSpecificConfig = {},
  ) {
    this.modelsKeys = modelsKeys;
    this.llmModelsMetadata = modelsMetadata;
    this.errorPatterns = errorPatterns;
    this.providerSpecificConfig = providerSpecificConfig;
  }

  /**
   * Get the models metadata in a readonly format to prevent modifications by the caller.
   */
  getModelsMetadata() {
    return Object.freeze({ ...this.llmModelsMetadata });
  }

  /**
   * Get the provider-specific configuration in a readonly format.
   */
  getProviderSpecificConfig() {
    return Object.freeze({ ...this.providerSpecificConfig });
  }

  /**
   * Get the model key for the embeddings model.
   */
  getAvailableCompletionModelQualities() {
    const llmQualities: LLMModelQuality[] = [LLMModelQuality.PRIMARY];
    const secondaryCompletion = this.modelsKeys.secondaryCompletionModelKey;
    if (secondaryCompletion) llmQualities.push(LLMModelQuality.SECONDARY);
    return llmQualities;
  }

  /**
   * Get the model key for the embeddings model.
   */
  getModelsNames() {
    return [
      this.llmModelsMetadata[this.modelsKeys.embeddingsModelKey].urn,
      this.llmModelsMetadata[this.modelsKeys.primaryCompletionModelKey].urn,
      this.modelsKeys.secondaryCompletionModelKey
        ? this.llmModelsMetadata[this.modelsKeys.secondaryCompletionModelKey].urn
        : "n/a",
    ];
  }

  /**
   * Get the model key for the embeddings model.
   */
  getEmbeddedModelDimensions() {
    return this.llmModelsMetadata[this.modelsKeys.embeddingsModelKey].dimensions;
  }

  /**
   * Generate embeddings for the given content.
   * Uses arrow function to enable easier binding of `this` context.
   */
  generateEmbeddings = async (
    content: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse> => {
    return this.executeLLMImplFunction(
      this.modelsKeys.embeddingsModelKey,
      LLMPurpose.EMBEDDINGS,
      content,
      context,
      options,
    );
  };

  /**
   * Execute the LLM function for the primary completion model.
   * Uses arrow function to enable easier binding of `this` context.
   */
  executeCompletionPrimary = async (
    prompt: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse> => {
    return this.executeLLMImplFunction(
      this.modelsKeys.primaryCompletionModelKey,
      LLMPurpose.COMPLETIONS,
      prompt,
      context,
      options,
    );
  };

  /**
   * Execute the LLM function for the secondary completion model.
   * Uses arrow function to enable easier binding of `this` context.
   */
  executeCompletionSecondary = async (
    prompt: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse> => {
    const secondaryCompletion = this.modelsKeys.secondaryCompletionModelKey;
    if (!secondaryCompletion)
      throw new BadConfigurationLLMError(
        `'Secondary' text model for ${this.constructor.name} was not defined`,
      );
    return this.executeLLMImplFunction(
      secondaryCompletion,
      LLMPurpose.COMPLETIONS,
      prompt,
      context,
      options,
    );
  };

  /**
   * Close the LLM client.
   */
  async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }

  /**
   * Used for debugging purposes - prints the error type and message to the console.
   */
  protected debugCurrentlyNonCheckedErrorTypes(error: unknown, modelKey: string) {
    if (error instanceof Error) {
      console.log(
        `${error.constructor.name}: ${getErrorText(error)} - LLM: ${this.llmModelsMetadata[modelKey].urn}`,
      );
    }
  }

  /**
   * Extract token usage information from LLM response metadata, defaulting missing
   * values.
   */
  protected extractTokensAmountFromMetadataDefaultingMissingValues(
    modelKey: string,
    tokenUsage: LLMResponseTokensUsage,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  ): LLMResponseTokensUsage {
    let { promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
    if (completionTokens < 0) completionTokens = 0;
    if (maxTotalTokens < 0) maxTotalTokens = modelsMetadata[modelKey].maxTotalTokens;
    if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens + 1);
    return { promptTokens, completionTokens, maxTotalTokens };
  }

  /**
   * Post-process the LLM response, converting it to JSON if necessary, and build the
   * response metadaat object.
   */
  protected postProcessAsJSONIfNeededGeneratingNewResult(
    skeletonResult: LLMFunctionResponse,
    modelKey: string,
    taskType: LLMPurpose,
    responseContent: LLMGeneratedContent,
    completionOptions: LLMCompletionOptions | undefined,
    context: LLMContext,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    logProcessingWarning = false,
  ): LLMFunctionResponse {
    if (taskType === LLMPurpose.COMPLETIONS) {
      try {
        const generatedContent =
          completionOptions?.outputFormat === LLMOutputFormat.JSON
            ? convertTextToJSONAndOptionallyValidate(responseContent, completionOptions)
            : responseContent;
        return {
          ...skeletonResult,
          status: LLMResponseStatus.COMPLETED,
          generated: generatedContent,
        };
      } catch (error: unknown) {
        if (logProcessingWarning) {
          console.warn(
            `LLM response for model '${modelsMetadata[modelKey].urn}' cannot be parsed to JSON so marking as overloaded just to be able to try again in the hope of a better response for the next attempt - Error: ${getErrorText(error)}`,
          );
        }
        context.jsonParseError = getErrorText(error);
        return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };
      }
    } else {
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
    }
  }

  /**
   * Executes the LLM function for the given model key and task type.
   */
  private async executeLLMImplFunction(
    modelKey: string,
    taskType: LLMPurpose,
    request: string,
    context: LLMContext,
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse> {
    const skeletonResponse = { status: LLMResponseStatus.UNKNOWN, request, context, modelKey };

    try {
      const { isIncompleteResponse, responseContent, tokenUsage } =
        await this.invokeImplementationSpecificLLM(taskType, modelKey, request, completionOptions);

      if (isIncompleteResponse) {
        // Often occurs if combination of prompt + generated completion execeed the max token limit (e.g. actual internal LLM completion has been executed and the completion has been cut short)
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.EXCEEDED,
          tokensUage: this.extractTokensAmountFromMetadataDefaultingMissingValues(
            modelKey,
            tokenUsage,
            this.llmModelsMetadata,
          ),
        };
      } else {
        return this.postProcessAsJSONIfNeededGeneratingNewResult(
          skeletonResponse,
          modelKey,
          taskType,
          responseContent,
          completionOptions,
          context,
          this.llmModelsMetadata,
        );
      }
    } catch (error: unknown) {
      // Explicitly type error as unknown
      // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error, modelKey);

      if (this.isLLMOverloaded(error)) {
        return { ...skeletonResponse, status: LLMResponseStatus.OVERLOADED };
      } else if (this.isTokenLimitExceeded(error)) {
        // Often occurs if the prompt on its own execeeds the max token limit (e.g. actual internal LLM completion generation was not even initiated by the LLM)
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.EXCEEDED,
          tokensUage: extractTokensAmountAndLimitFromErrorMsg(
            modelKey,
            request,
            getErrorText(error),
            this.llmModelsMetadata,
            this.errorPatterns,
          ),
        };
      } else {
        return { ...skeletonResponse, status: LLMResponseStatus.ERRORED, error };
      }
    }
  }

  /**
   * Get the model family for this LLM provider.
   */
  abstract getModelFamily(): string;

  /**
   * Invoke the implementation-specific LLM function.
   */
  protected abstract invokeImplementationSpecificLLM(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMImplSpecificResponseSummary>;

  /**
   * Is the LLM overloaded?
   */
  protected abstract isLLMOverloaded(error: unknown): boolean;

  /**
   * Is the token limit exceeded?
   */
  protected abstract isTokenLimitExceeded(error: unknown): boolean;
}
