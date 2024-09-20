import { extractTokensAmountFromMetadataDefaultingMissingValues, 
         extractTokensAmountAndLimitFromErrorMsg, postProcessAsJSONIfNeededGeneratingNewResult,
       } from "./llm-response-tools";
import { LLMModelQualities, LLMContext, LLMPurpose, LLMProviderImpl, LLMFunctionResponse, 
         LLMResponseStatus, LLMImplResponseSummary } from "../types/llm-types";
import { getErrorText } from "../utils/error-utils";       


/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
abstract class AbstractLLM implements LLMProviderImpl {
  private readonly embeddingsModel: string;
  private readonly completionsModelRegular: string | null;
  private readonly completionsModelPremium: string | null;


  /**
   * Constructor.
   */
  constructor(embeddingsModel: string, completionsModelRegular: string | null, completionsModelPremium: string | null) { 
    this.embeddingsModel = embeddingsModel;
    this.completionsModelRegular = completionsModelRegular;
    this.completionsModelPremium = completionsModelPremium;
  }


  /**
   * Get the types of different token context windows models supported.
   */ 
  public getAvailableCompletionModelQualities(): LLMModelQualities[] {
    const llmQualities: LLMModelQualities[] = [];

    if (this.completionsModelRegular) {
      llmQualities.push(LLMModelQualities.REGULAR);
    }

    if (this.completionsModelPremium) {
      llmQualities.push(LLMModelQualities.PREMIUM);
    }

    return llmQualities;
  }
  

  /**
   * Send the content to the LLM for it to generate and return the content's embeddings.
   */
  public async generateEmbeddings(content: string, _doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.embeddingsModel) throw new Error(`Embeddings model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.executeLLMImplFunction(this.embeddingsModel, LLMPurpose.EMBEDDINGS, content, false, context);
  }


  /**
   * Send the prompt to the 'regular' LLM and retrieve the LLM's answer.
   */
  public async executeCompletionRegular(prompt: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.completionsModelRegular) throw new Error(`'Regular' text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.executeLLMImplFunction(this.completionsModelRegular, LLMPurpose.COMPLETION, prompt, doReturnJSON, context);
  }


  /**
   * Send the prompt to the 'premium' LLM and retrieve the LLM's answer.
   */
  public async executeCompletionPremium(prompt: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.completionsModelPremium) throw new Error(`'Premium' text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return await this.executeLLMImplFunction(this.completionsModelPremium, LLMPurpose.COMPLETION, prompt, doReturnJSON, context);
  }


  /**
   * Method to close underlying LLM client library to release resources.
   */
  public async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }
  
      
  /**
   * Abstract method to be overridden to get the names of the models this plug-in provides.
   */
  public abstract getModelsNames(): { embeddings: string, regular: string, premium: string };


  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected abstract invokeLLMSpecificLLMSummarizingItsResponse(taskType: LLMPurpose, model: string, prompt: string): Promise<LLMImplResponseSummary>;


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


  /**
   * Method to invoke the pluggable implementation of an LLM and then take the proprietary response
   * and normalise them back for geneeric consumption.
   */
  private async executeLLMImplFunction(model: string, taskType: LLMPurpose, request: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse> { 
    const skeletonResponse = { status: LLMResponseStatus.UNKNOWN, request, context, model };

    try {
      const { isIncompleteResponse, responseContent, tokenUsage } = await this.invokeLLMSpecificLLMSummarizingItsResponse(taskType, model, request);

      if (isIncompleteResponse) {
        return { ...skeletonResponse, status: LLMResponseStatus.EXCEEDED, tokensUage: extractTokensAmountFromMetadataDefaultingMissingValues(model, tokenUsage) };
      } else {
        return postProcessAsJSONIfNeededGeneratingNewResult(skeletonResponse, model, taskType, responseContent, doReturnJSON);
      }
    } catch (error: unknown) {
      if (this.isLLMOverloaded(error)) {
        return { ...skeletonResponse, status: LLMResponseStatus.OVERLOADED };
      } else if (this.isTokenLimitExceeded(error)) {
        return { ...skeletonResponse, status: LLMResponseStatus.EXCEEDED, tokensUage: extractTokensAmountAndLimitFromErrorMsg(model, request, getErrorText(error)) };
      } else {
        throw error;
      }
    }
  }
}  


export default AbstractLLM;