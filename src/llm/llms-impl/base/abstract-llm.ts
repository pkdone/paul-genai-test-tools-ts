import { LLMModelQuality, LLMContext, LLMPurpose, LLMProviderImpl, LLMResponseStatus,
         LLMConfiguredModelTypesNames, ModelKey} from "../../../types/llm-types";
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
  /**
   * Constructor.
   */
  constructor(private readonly embeddingsModelKey: ModelKey, private readonly completionsModelPrimaryKey: ModelKey | null, private readonly completionsModelSecondaryKey: ModelKey | null) {}

  /**
   * Get the types of different token context windows models supported.
   */ 
  getAvailableCompletionModelQualities(): LLMModelQuality[] {
    const llmQualities: LLMModelQuality[] = [];

    if (this.completionsModelPrimaryKey) {
      llmQualities.push(LLMModelQuality.PRIMARY);
    }

    if (this.completionsModelSecondaryKey) {
      llmQualities.push(LLMModelQuality.SECONDARY);
    }

    return llmQualities;
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embeddings.
   * 
   * Need _asJson arg because this function and executeCompletion* functions will all be
   * called generically with the same args.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateEmbeddings(content: string, _asJson = false, context: LLMContext = {}) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.embeddingsModelKey) throw new BadConfigurationLLMError(`Embeddings model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.executeLLMImplFunction(this.embeddingsModelKey, LLMPurpose.EMBEDDINGS, content, false, context);
  }

  /**
   * Send the prompt to the LLM for using the 'primary' model quality specifically, and retrieve
   * the LLM's answer.
   */
  async executeCompletion(prompt: string, asJson = false, context: LLMContext = {}) {
    return await this.executeCompletionPrimary(prompt, asJson, context); 
  }

  /**
   * Send the prompt to the 'primary' LLM and retrieve the LLM's answer.
   */
  async executeCompletionPrimary(prompt: string, asJson = false, context: LLMContext = {}) {
    if (!this.completionsModelPrimaryKey) throw new BadConfigurationLLMError(`'Primary' text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.executeLLMImplFunction(this.completionsModelPrimaryKey, LLMPurpose.COMPLETIONS, prompt, asJson, context);
  }

  /**
   * Send the prompt to the 'secondary' LLM and retrieve the LLM's answer.
   */
  async executeCompletionSecondary(prompt: string, asJson = false, context: LLMContext = {}) {
    if (!this.completionsModelSecondaryKey) throw new BadConfigurationLLMError(`'Secondary' text model represented by ${this.constructor.name} does not exist - do not use this method`);
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
  private async executeLLMImplFunction(modelKey: ModelKey, taskType: LLMPurpose, request: string, asJson: boolean, context: LLMContext) { 
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
   * Abstract method to be overridden to get the names of the models this plug-in provides.
   */
  abstract getModelsNames(): LLMConfiguredModelTypesNames;

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