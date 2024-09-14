import { extractTokensAmountFromMetadataDefaultingMissingValues, 
         extractTokensAmountAndLimitFromErrorMsg, postProcessAsJSONIfNeededGeneratingNewResult,
       } from "./llm-response-tools";
import { LLMModelQuality, LLMContext, LLMPurpose, LLMResponseTokensUsage, LLMProviderImpl,
         LLMFunctionResponse, LLMGeneratedContent, LLMResponseStatus,LLMErrorMsgRegExPattern } 
       from "../types/llm-types";


/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
abstract class AbstractLLM implements LLMProviderImpl {
  protected embeddingsModel: string;
  protected completionsModelRegular: string | null;
  protected completionsModelPremium: string | null;


  /**
   * Constructor.
   */
  constructor(embeddingsModel: string, completionsModelRegular: string | null, completionsModelPremium: string | null) { 
    this.embeddingsModel = embeddingsModel;
    this.completionsModelRegular = completionsModelRegular;
    this.completionsModelPremium = completionsModelPremium;
  }


  /**
   * Abstract method to be overridden to get the names of the models this plug-in provides.
   */
  public abstract getModelsNames(): { embeddings: string, regular: string, premium: string };

  /**
   * Abstract method to be overridden to execute the prompt against the LLM and return the LLM's
   * answer.
   */
  protected abstract runLLMTask(model: string, taskType: LLMPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse>;


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
   * Method to close underlying LLM client library to release resources.
   */
  public async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }

  
  /**
   * Function to capture the LLM response from a successful call and build the LLMFunctionResponse.
   * object.
   */
  protected captureLLMResponseFromSuccessfulCall(request: string, context: LLMContext, isIncompleteResponse: boolean, model: string, responseContent: LLMGeneratedContent, tokenUsage: LLMResponseTokensUsage, taskType: LLMPurpose, doReturnJSON: boolean) {
    let result = { status: LLMResponseStatus.UNKNOWN, request, context, model };

    if (isIncompleteResponse) {
      const tokensUage = extractTokensAmountFromMetadataDefaultingMissingValues(model, tokenUsage);
      Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage });
    } else {
      result = postProcessAsJSONIfNeededGeneratingNewResult(result, model, taskType, responseContent, doReturnJSON);
    }
    
    return result;
  }


  /** 
   * Function to capture the LLM response from a thrown error and build the response metadata
   * object.
   */
  protected captureLLMResponseFromThrownError(error: unknown, request: string, context: LLMContext, model: string, patternDefinitions: LLMErrorMsgRegExPattern[]): LLMFunctionResponse {
    let result = { status: LLMResponseStatus.UNKNOWN, request, context, model };

    if (this.isLLMOverloaded(error)) {
      Object.assign(result, { status: LLMResponseStatus.OVERLOADED });
    } else if ((error instanceof Error) && ("message" in error) && this.isTokenLimitExceeded(error)) {
      Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage: extractTokensAmountAndLimitFromErrorMsg(model, patternDefinitions, request, error.message) });
    } else {
      throw error;
    }

    return result;
  }

    
  /**
   * Get the types of different token context windows models supported.
   */ 
  public getAvailableCompletionModelQualities(): LLMModelQuality[] {
    const llmQualities: LLMModelQuality[] = [];

    if (this.completionsModelRegular) {
      llmQualities.push(LLMModelQuality.REGULAR);
    }

    if (this.completionsModelPremium) {
      llmQualities.push(LLMModelQuality.PREMIUM);
    }

    return llmQualities;
  }
  

  /**
   * Send the content to the LLM for it to generate and return the content's embeddings.
   */
  public async generateEmbeddings(content: string, _doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.embeddingsModel) throw new Error(`Embeddings model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.runLLMTask(this.embeddingsModel, LLMPurpose.EMBEDDINGS, content, false, context);
  }


  /**
   * Send the prompt to the 'regular' LLM and retrieve the LLM's answer.
   */
  public async executeCompletionRegular(prompt: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.completionsModelRegular) throw new Error(`'Regular' text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.runLLMTask(this.completionsModelRegular, LLMPurpose.COMPLETION, prompt, doReturnJSON, context);
  }


  /**
   * Send the prompt to the 'premium' LLM and retrieve the LLM's answer.
   */
  public async executeCompletionPremium(prompt: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.completionsModelPremium) throw new Error(`'Premium' text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return await this.runLLMTask(this.completionsModelPremium, LLMPurpose.COMPLETION, prompt, doReturnJSON, context);
  }
}  


export default AbstractLLM;