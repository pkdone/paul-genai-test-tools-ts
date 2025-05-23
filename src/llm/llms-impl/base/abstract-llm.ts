import { LLMModelQuality, LLMContext, LLMPurpose, LLMProviderImpl, LLMResponseStatus,
         LLMModelSet, LLMFunctionResponse, LLMModelMetadata } from "../../../types/llm-types";
import { ModelKey, ModelFamily } from "../../../types/llm-models-types";
import { LLMImplSpecificResponseSummary } from "../llm-impl-types";
import { getErrorText } from "../../../utils/error-utils";       
import { extractTokensAmountFromMetadataDefaultingMissingValues, 
         extractTokensAmountAndLimitFromErrorMsg, postProcessAsJSONIfNeededGeneratingNewResult,
       } from "../../llm-response-tools";
import { BadConfigurationLLMError } from "../../../types/llm-errors";
import { llmModelsMetadataLoaderSrvc } from "../../llm-configurator/llm-models-metadata-loader";

/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
abstract class AbstractLLM implements LLMProviderImpl {
  // Fields
  protected readonly llmModelsMetadata: Record<string, LLMModelMetadata>;
  private readonly modelsKeys: LLMModelSet;
  
  /**
   * Constructor.
   */
  constructor(modelsKeys: LLMModelSet) {
    this.modelsKeys = modelsKeys;
    this.llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
  }

  /**
   * Get the model key for the embeddings model.
   */
  getAvailableCompletionModelQualities(): LLMModelQuality[] {
    const llmQualities: LLMModelQuality[] = [LLMModelQuality.PRIMARY];
    if (this.modelsKeys.secondaryCompletion !== ModelKey.UNSPECIFIED) llmQualities.push(LLMModelQuality.SECONDARY);
    return llmQualities;
  }

  /**
   * Get the model key for the embeddings model.
   */
  getModelsNames(): string[] {
    return [
      this.llmModelsMetadata[this.modelsKeys.embeddings].modelId,
      this.llmModelsMetadata[this.modelsKeys.primaryCompletion].modelId,
      this.modelsKeys.secondaryCompletion
        ? this.llmModelsMetadata[this.modelsKeys.secondaryCompletion].modelId
        : "n/a"
    ];
  }  

  /**
   * Get the model key for the embeddings model.
   */
  getEmbeddedModelDimensions() {
    return this.llmModelsMetadata[this.modelsKeys.embeddings].dimensions;
  }

  /**
   * Generate embeddings for the given content.
   */
  async generateEmbeddings(content: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    return this.executeLLMImplFunction(this.modelsKeys.embeddings, LLMPurpose.EMBEDDINGS, content, asJson, context);
  }

  /**
   * Execute the LLM function for the primary completion model.
   */
  async executeCompletionPrimary(prompt: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    return this.executeLLMImplFunction(this.modelsKeys.primaryCompletion, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  /**
   * Execute the LLM function for the secondary completion model.
   */
  async executeCompletionSecondary(prompt: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (this.modelsKeys.secondaryCompletion === ModelKey.UNSPECIFIED) throw new BadConfigurationLLMError(`'Secondary' text model for ${this.constructor.name} was not defined`);
    const secondaryCompletion = this.modelsKeys.secondaryCompletion;
    if (!secondaryCompletion) throw new BadConfigurationLLMError(`'Secondary' text model for ${this.constructor.name} was not defined`);
    return await this.executeLLMImplFunction(secondaryCompletion, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  /**
   * Close the LLM client.
   */
  async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }

  /**
   * Used for debugging purposes - prints the error type and message to the console.
   */
  protected debugCurrentlyNonCheckedErrorTypes(error: unknown, modelKey: ModelKey) {
    if (error instanceof Error) {
      console.log(`${error.constructor.name}: ${getErrorText(error)} - LLM: ${this.llmModelsMetadata[modelKey].modelId}`);
    }
  }

  /**
   * Executes the LLM function for the given model key and task type.
   */
  private async executeLLMImplFunction(modelKey: ModelKey, taskType: LLMPurpose, request: string, asJson: boolean, context: LLMContext): Promise<LLMFunctionResponse> { 
    const skeletonResponse = { status: LLMResponseStatus.UNKNOWN, request, context, modelKey };

    try {
      const { isIncompleteResponse, responseContent, tokenUsage } = await this.invokeImplementationSpecificLLM(taskType, modelKey, request);

      if (isIncompleteResponse) { // Often occurs if combination of prompt + generated completion execeed the max token limit (e.g. actual internal LLM completion has been executed and the completion has been cut short)
        return { ...skeletonResponse, status: LLMResponseStatus.EXCEEDED, tokensUage: extractTokensAmountFromMetadataDefaultingMissingValues(modelKey, tokenUsage) };
      } else {
        return postProcessAsJSONIfNeededGeneratingNewResult(skeletonResponse, modelKey, taskType, responseContent, asJson, context);
      }
    } catch (error: unknown) { // Explicitly type error as unknown
      // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error, modelKey);

      if (this.isLLMOverloaded(error)) {
        return { ...skeletonResponse, status: LLMResponseStatus.OVERLOADED };
      } else if (this.isTokenLimitExceeded(error)) { // Often occurs if the prompt on its own execeeds the max token limit (e.g. actual internal LLM completion generation was not even initiated by the LLM)
        return { ...skeletonResponse, status: LLMResponseStatus.EXCEEDED, tokensUage: extractTokensAmountAndLimitFromErrorMsg(modelKey, request, getErrorText(error)) };
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the model family for this LLM provider.
   */
  abstract getModelFamily(): ModelFamily;

  /**
   * Invoke the implementation-specific LLM function.
   */
  protected abstract invokeImplementationSpecificLLM(taskType: LLMPurpose, modelKey: ModelKey, prompt: string): Promise<LLMImplSpecificResponseSummary>;

  /**
   * Is the LLM overloaded?
   */
  protected abstract isLLMOverloaded(error: unknown): boolean;

  /**
   * Is the token limit exceeded?
   */
  protected abstract isTokenLimitExceeded(error: unknown): boolean;
}  

export default AbstractLLM;