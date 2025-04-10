import { LLMModelQuality, LLMContext, LLMPurpose, LLMProviderImpl, LLMResponseStatus,
         LLMConfiguredModelTypesNames, LLMFunctionResponse, ModelKey} from "../../../types/llm-types";
import { llmModels } from "../../../types/llm-constants";
import { LLMImplSpecificResponseSummary } from "../llm-impl-types";
import { getErrorText } from "../../../utils/error-utils";       
import { extractTokensAmountFromMetadataDefaultingMissingValues, 
         extractTokensAmountAndLimitFromErrorMsg, postProcessAsJSONIfNeededGeneratingNewResult,
       } from "../../llm-response-tools";
import { BadConfigurationLLMError } from "../../../types/llm-errors";

/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
abstract class AbstractLLM implements LLMProviderImpl {
  // Private fields
  private readonly completionsModelPrimaryKey: ModelKey;
  private readonly completionsModelSecondaryKey: ModelKey;

  /**
   * Constructor.
   */
  constructor(private readonly embeddingsModelKey: ModelKey, readonly completionsModelsKeys: ModelKey[]) {
    if (completionsModelsKeys.length === 0) throw new BadConfigurationLLMError(`No completions models provided for ${this.constructor.name}`);
    this.completionsModelPrimaryKey = completionsModelsKeys[0];
    this.completionsModelSecondaryKey = completionsModelsKeys.length > 1 ? completionsModelsKeys[1] : ModelKey.UNSPECIFIED;
  }

  /**
   * Get the types of different token context windows models supported.
   */ 
  getAvailableCompletionModelQualities(): LLMModelQuality[] {
    const llmQualities: LLMModelQuality[] = [LLMModelQuality.PRIMARY];
    if (this.completionsModelSecondaryKey !== ModelKey.UNSPECIFIED) llmQualities.push(LLMModelQuality.SECONDARY);
    return llmQualities;
  }

  /**
   * Get the names of the models this plug-in provides.
   */ 
  getModelsNames(): LLMConfiguredModelTypesNames {
    return {
      embeddings: llmModels[this.embeddingsModelKey].modelId,
      primary: llmModels[this.completionsModelPrimaryKey].modelId,
      secondary: llmModels[this.completionsModelSecondaryKey].modelId,
    };
  }  

  /**
   * Get the maximum number of tokens for the given model quality. 
   */
  getEmbeddedModelDimensions() {
    return llmModels[this.embeddingsModelKey].dimensions;
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embeddings.
   * 
   * Need _asJson arg because this function and executeCompletion* functions will all be
   * called generically with the same args.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateEmbeddings(content: string, _asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.embeddingsModelKey) throw new BadConfigurationLLMError(`Embeddings model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.executeLLMImplFunction(this.embeddingsModelKey, LLMPurpose.EMBEDDINGS, content, false, context);
  }

  /**
   * Send the prompt to the 'primary' LLM and retrieve the LLM's answer.
   */
  async executeCompletionPrimary(prompt: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    return this.executeLLMImplFunction(this.completionsModelPrimaryKey, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  /**
   * Send the prompt to the 'secondary' LLM and retrieve the LLM's answer.
   */
  async executeCompletionSecondary(prompt: string, asJson = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (this.completionsModelSecondaryKey === ModelKey.UNSPECIFIED) throw new BadConfigurationLLMError(`'Secondary' text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return await this.executeLLMImplFunction(this.completionsModelSecondaryKey, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  /**
   * Method to close underlying LLM client library to release resources.
   */
  async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }
  
  /**
   * Method to invoke the pluggable implementation of an LLM and then take the proprietary response
   * and normalise them back for geneeric consumption.
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
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected abstract invokeImplementationSpecificLLM(taskType: LLMPurpose, modelKey: ModelKey, prompt: string): Promise<LLMImplSpecificResponseSummary>;

  /**
   * Abstract method to be overridden. Check if an error object indicates a network issue or
   * throttling event.
   */
  protected abstract isLLMOverloaded(error: unknown): boolean;

  /**
   * Abstract method to be overridden. Check if error code indicates potential token limit has been
   * exceeded.
   */
  protected abstract isTokenLimitExceeded(error: unknown): boolean;
}  

export default AbstractLLM;