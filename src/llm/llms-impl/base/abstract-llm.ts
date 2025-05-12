import { LLMModelQuality, LLMContext, LLMPurpose, LLMProviderImpl, LLMResponseStatus,
         LLMModelSet, LLMFunctionResponse, LLMModelMetadata } from "../../../types/llm-types";
import { ModelKey, ModelFamily } from "../../../types/llm-models-metadata";
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
  
  // Constructor
  constructor(modelsKeys: LLMModelSet) {
    this.modelsKeys = modelsKeys;
    this.llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
  }

  // Public methods
  getAvailableCompletionModelQualities(): LLMModelQuality[] {
    const llmQualities: LLMModelQuality[] = [LLMModelQuality.PRIMARY];
    if (this.modelsKeys.secondaryCompletion !== ModelKey.UNSPECIFIED) llmQualities.push(LLMModelQuality.SECONDARY);
    return llmQualities;
  }

  getModelsNames(): string[] {
    return [
      this.llmModelsMetadata[this.modelsKeys.embeddings].modelId,
      this.llmModelsMetadata[this.modelsKeys.primaryCompletion].modelId,
      this.modelsKeys.secondaryCompletion
        ? this.llmModelsMetadata[this.modelsKeys.secondaryCompletion].modelId
        : "n/a"
    ];
  }  

  getEmbeddedModelDimensions() {
    return this.llmModelsMetadata[this.modelsKeys.embeddings].dimensions;
  }

  async generateEmbeddings(content: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    return this.executeLLMImplFunction(this.modelsKeys.embeddings, LLMPurpose.EMBEDDINGS, content, asJson, context);
  }

  async executeCompletionPrimary(prompt: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    return this.executeLLMImplFunction(this.modelsKeys.primaryCompletion, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  async executeCompletionSecondary(prompt: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (this.modelsKeys.secondaryCompletion === ModelKey.UNSPECIFIED) throw new BadConfigurationLLMError(`'Secondary' text model for ${this.constructor.name} was not defined`);
    const secondaryCompletion = this.modelsKeys.secondaryCompletion;
    if (!secondaryCompletion) throw new BadConfigurationLLMError(`'Secondary' text model for ${this.constructor.name} was not defined`);
    return await this.executeLLMImplFunction(secondaryCompletion, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }

  // Protected methods
  protected debugCurrentlyNonCheckedErrorTypes(error: unknown, modelKey: ModelKey) {
    if (error instanceof Error) {
      console.log(`${error.constructor.name}: ${getErrorText(error)} - LLM: ${this.llmModelsMetadata[modelKey].modelId}`);
    }
  }

  // Private methods
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

  // Abstract methods must be declared last
  abstract getModelFamily(): ModelFamily;
  protected abstract invokeImplementationSpecificLLM(taskType: LLMPurpose, modelKey: ModelKey, prompt: string): Promise<LLMImplSpecificResponseSummary>;
  protected abstract isLLMOverloaded(error: unknown): boolean;
  protected abstract isTokenLimitExceeded(error: unknown): boolean;
}  

export default AbstractLLM;