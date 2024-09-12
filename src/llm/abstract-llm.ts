import { llmConst } from "../types/llm-constants";
import { llmModels } from "../types/llm-models";
import { LLMModelQuality, LLMContext, LLMPurpose, LLMResponseTokensUsage, LLMProviderImpl,
         LLMFunctionResponse, LLMGeneratedContent, LLMResponseStatus,LLMErrorMsgRegExPattern, 
         LLMError} 
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
   * Abstract method to be overridden to execute the prompt against the LLM and return the LLM's answer.
   */
  protected abstract runLLMTask(model: string, taskType: LLMPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse>;


  /**
   * Method to close underlying LLM client library to release resources.
   */
  public async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }


  /**
   * Abstract method to be overridden. Check if an error object indicates a network issue or throttling event.
   */
  protected abstract isLLMOverloaded(error: unknown): boolean;


  /**
   * Abstract method to be overridden. Check if error code indicates potential token limit has been exceeded.
   */
  protected abstract isTokenLimitExceeded(error: unknown): boolean;


  /**
   * Build the full LLM parameters structure for the specific models and prompt based on the
   * received LLM response.
   */
  protected captureLLMResponseFromSuccessfulCall(request: string, context: LLMContext, isIncompleteResponse: boolean, model: string, responseContent: LLMGeneratedContent, tokenUsage: LLMResponseTokensUsage, taskType: LLMPurpose, doReturnJSON: boolean) {
    let result = { status: LLMResponseStatus.UNKNOWN, request, context, model };

    if (isIncompleteResponse) {
      const tokensUage = this.extractTokensAmountFromMetadataDefaultingMissingValues(model, tokenUsage);
      Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage });
    } else {
      result = this.postProcessAsJSONIfNeededGeneratingNewResult(result, model, taskType, responseContent, doReturnJSON);
    }
    return result;
  }


  /** 
   * Build the full LLM parameters structure for the specific models and prompt based on the 
   * received LLM error.
   */
  protected captureLLMResponseFromThrownError(error: unknown, request: string, context: LLMContext, model: string, patternDefinitions: LLMErrorMsgRegExPattern[]): LLMFunctionResponse {
    let result = { status: LLMResponseStatus.UNKNOWN, request, context, model };

    if (this.isLLMOverloaded(error)) {
      Object.assign(result, { status: LLMResponseStatus.OVERLOADED });
    } else if (this.isTokenLimitExceeded(error)) {
      const llmError = error as LLMError;
      if (!llmError.message) throw error;
      Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage: this.extractTokensAmountAndLimitFromErrorMsg(model, patternDefinitions, request, llmError.message) });
    } else {
      throw error;
    }

    return result;
  }


  /**
   * From a LLM API response object, use the values of the fields indicating prompt tokens used,
   * completion tokens used and total tokens available, if specified, otherwise estimate the missing
   * values.
   */
  protected extractTokensAmountFromMetadataDefaultingMissingValues(model: string, tokenUsage: LLMResponseTokensUsage): LLMResponseTokensUsage {
    let {promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
    if (completionTokens < 0) completionTokens = 0;
    if (maxTotalTokens < 0) maxTotalTokens = llmModels[model].maxTotalTokens;
    if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens);
    return { promptTokens, completionTokens, maxTotalTokens };
  }
  

  /**
   * From a LLM API thrown error's text message, extract the values of the fields indicating token
   * limit and prompt tokens used (completion tokens may or may not also be specified - assumed to
   * be zero if not specified in the error message).
   */
  protected extractTokensAmountAndLimitFromErrorMsg(model: string, patternDefinitions: LLMErrorMsgRegExPattern[], prompt: string, errorMsg: string): LLMResponseTokensUsage {
    let promptTokens = -1;
    let completionTokens = 0;
    let maxTotalTokens = -1;    

    if (patternDefinitions) {
      for (const patternDefinition of patternDefinitions) {
        const matches = errorMsg.match(patternDefinition.pattern);

        if (matches && matches.length > 2) {
          if (patternDefinition.units === "tokens") {
            maxTotalTokens = parseInt(matches[1], 10);
            promptTokens = parseInt(matches[2], 10);
            completionTokens = matches.length > 3 ? parseInt(matches[3], 10) : 0;
          } else {
            const charsLimit = parseInt(matches[1], 10);
            const charsPrompt = parseInt(matches[2], 10);
            maxTotalTokens = llmModels[model].maxTotalTokens;  
            const promptTokensDerived = Math.ceil((charsPrompt/ charsLimit) * maxTotalTokens);
            promptTokens = Math.max(promptTokensDerived, maxTotalTokens + 1);
          }
          
          break;
        }
      }
    }

    const publishedMaxTotalTokens  = llmModels[model].maxTotalTokens;

    if (promptTokens < 0) { 
      const assumedMaxTotalTokens = (maxTotalTokens > 0) ? maxTotalTokens : publishedMaxTotalTokens;
      const estimatedPromptTokensConsumed = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      promptTokens = Math.max(estimatedPromptTokensConsumed, (assumedMaxTotalTokens + 1));
    }

    if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
    return { promptTokens, completionTokens, maxTotalTokens };
  }    


  /** 
   * Optionally convert the LLM response content to JSON and if can't parse JSON, asssume content 
   * needs to be reduced in size.
   */
  protected postProcessAsJSONIfNeededGeneratingNewResult(skeletonResult: LLMFunctionResponse, model: string, taskType: LLMPurpose, responseContent: LLMGeneratedContent, doReturnJSON: boolean): LLMFunctionResponse {
    if (taskType === LLMPurpose.COMPLETION) {
      try {
        let generatedConstant = responseContent as string;
        if (doReturnJSON) generatedConstant = this.convertTextToJSON(generatedConstant);
        return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedConstant };
      } catch (error) {
        console.log(`ISSUE: LLM response cannot be parsed to JSON  (model '${model})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
        return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };
      }
    } else {
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
    }      
  }  
  

  /**
   * Convert the LLM response content to JSON, trimming the content to only include the JSON part.
   */
  private convertTextToJSON(content: string): string {
    const startJSONIndex = content.indexOf("{");
    const endJSONIndex = content.lastIndexOf("}");

    if (startJSONIndex === -1 || endJSONIndex === -1) {
      throw new Error("Invalid input: No JSON content found.");
    }

    const trimmedContent = content.substring(startJSONIndex, endJSONIndex + 1);
    const sanitizedContent = trimmedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x0A\x0D\x09]/g, " ");  // Remove control characters
    return JSON.parse(sanitizedContent);
  }

    
  /**
   * Get the sizes of token context windows models supported.
   */ 
  public getAvailableCompletionModelSizes(): LLMModelQuality[] {
    const sizes: LLMModelQuality[] = [];

    if (this.completionsModelRegular) {
      sizes.push(LLMModelQuality.REGULAR);
    }

    if (this.completionsModelPremium) {
      sizes.push(LLMModelQuality.PREMIUM);
    }

    return sizes;
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


  // Unit test hooks into protected methods
  TEST_extractTokensAmountAndLimitFromErrorMsg = this.extractTokensAmountAndLimitFromErrorMsg;
  TEST_extractTokensAmountFromMetadataDefaultingMissingValues = this.extractTokensAmountFromMetadataDefaultingMissingValues;
}  


export default AbstractLLM;