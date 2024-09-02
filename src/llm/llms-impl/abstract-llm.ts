import { llmConst, LLM_MODEL_MAX_TOKENS_LIMITS } from "../../types/llm-constants";
import { LLMModelSize, LLMContext, LLMInvocationPurpose, LLMResponseTokensUsage, LLMProviderImpl,
         LLMFunctionResponse, LLMGeneratedContent, LLMResponseStatus } from "../../types/llm-types";


/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
abstract class AbstractLLM implements LLMProviderImpl {
  protected embeddingsModel: string;
  protected completionsModelSmall: string | null;
  protected completionsModelLarge: string | null;


  /**
   * Constructor.
   */
  constructor(embeddingsModel: string, completionsModelSmall: string | null, completionsModelLarge: string | null) { 
    this.embeddingsModel = embeddingsModel;
    this.completionsModelSmall = completionsModelSmall;
    this.completionsModelLarge = completionsModelLarge;
  }


  /**
   * Abstract method to be overridden to get the names of the models this plug-in provides.
   */
  public abstract getModelsNames(): { embeddings: string, small: string, large: string };

  /**
   * Abstract method to be overridden to execute the prompt against the LLM and return the LLM's answer.
   */
  protected abstract runLLMTask(model: string, taskType: LLMInvocationPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse>;


  /**
   * Method to close underlying LLM client library to release resources.
   */
  public async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }


  /**
   * Optionally convert the LLM response content to JSON.
   */
  protected postProcessResponseAsJSONIfNeeded(responseContent: string, doReturnJSON: boolean): string {
    if (doReturnJSON) {
      const startJSONIndex = responseContent.indexOf("{");
      const endJSONIndex = responseContent.lastIndexOf("}");

      if (startJSONIndex === -1 || endJSONIndex === -1) {
        throw new Error("Invalid input: No JSON content found.");
      }

      const trimmedContent = responseContent.substring(startJSONIndex, endJSONIndex + 1);
      const sanitizedContent = trimmedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x0A\x0D\x09]/g, " ");

      try {
        const jsonContent = JSON.parse(sanitizedContent);
        return jsonContent;
      } catch (error: unknown) {
        throw error;
      }
    } else {
      return responseContent;
    }
  }


  /** 
   * Optionally convert the LLM response content to JSON and if can't parse JSON, asssume content 
   * needs to be reduced in size.
   */
  protected postProcessAsJSONIfNeededGettingNewResult(skeletonResult: LLMFunctionResponse, model: string, taskType: LLMInvocationPurpose, responseContent: LLMGeneratedContent, doReturnJSON: boolean): LLMFunctionResponse {
    if (taskType === LLMInvocationPurpose.COMPLETION) {
      try {
        const generated = this.postProcessResponseAsJSONIfNeeded(responseContent as string, doReturnJSON);
        return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated };
      } catch (error) {
        console.log(`ISSUE: Model '${model}' incapable of adhering to the prompt's request to generate JSON response so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
        return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };  
      }
    } else {
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
    }      
  }  
  

  /**
   * From a LLM API response object, use the values of the fields indicating prompt tokens used
   * and completion tokens used, if available, otherwise guess from the prompt and response content.
   */
  protected extractTokensAmountFromMetadataOrGuessFromContent(model: string, prompt: string, responseContent: LLMGeneratedContent, promptTokens: number | null | undefined, completionTokens: number | null | undefined, totalAvailableTokens: number | null | undefined): LLMResponseTokensUsage {
    const tokensLimitAssumed = totalAvailableTokens ?? LLM_MODEL_MAX_TOKENS_LIMITS[model];  

    if (!completionTokens || completionTokens <= 0) {
      const completionChars = responseContent ? responseContent.length : 0;
      completionTokens = Math.floor(completionChars / llmConst.MODEL_TOKENS_PER_CHAR_GUESS);
    }

    if (!promptTokens || promptTokens <= 0) {
      const promptTokensDerived = Math.floor(prompt.length / llmConst.MODEL_TOKENS_PER_CHAR_GUESS);
      promptTokens = Math.max(promptTokensDerived, tokensLimitAssumed - completionTokens + 1);
    }

    const totalTokens = Math.min(tokensLimitAssumed, promptTokens + completionTokens);
    return { promptTokens, completionTokens, totalTokens };
  }

  

  /**
   * From a LLM API thrown error's text message, extract the values of the fields indicating token
   * limit and prompt tokens used (completion tokens may or may not also be specified).
   */
  protected extractTokensAmountAndLimitFromErrorMsg(model: string, patternDefinitions: { pattern: RegExp, units: string }[], errorMsg: string | null): LLMResponseTokensUsage {
    let promptTokens = -1;
    let completionTokens = 0;
    let totalTokens = -1;    

    if (errorMsg && patternDefinitions) {
      for (const patternDefinition of patternDefinitions) {
        const matches = errorMsg.match(patternDefinition.pattern);

        if (matches && matches.length > 2) {
          if (patternDefinition.units === "tokens") {
            totalTokens = parseInt(matches[1], 10);
            promptTokens = parseInt(matches[2], 10);
            completionTokens = matches.length > 3 ? parseInt(matches[3], 10) : 0;
          } else {
            const charsLimit = parseInt(matches[1], 10);
            const charsPrompt = parseInt(matches[2], 10);
            totalTokens = LLM_MODEL_MAX_TOKENS_LIMITS[model];  
            const promptTokensDerived = Math.ceil(totalTokens / charsLimit * charsPrompt);
            promptTokens = Math.max(promptTokensDerived, totalTokens + 1);
          }
          
          break;
        }
      }
    }

    if (promptTokens < 0 || totalTokens < 0) { 
      throw new Error(`Unable to extract prompt tokens amount and limit numbers from error message: ${errorMsg}`);
    }

    return { promptTokens, completionTokens, totalTokens };
  }    


  /**
   * Get the sizes of token context windows models supported.
   */ 
  public getAvailableCompletionModelSizes(): LLMModelSize[] {
    const sizes: LLMModelSize[] = [];

    if (this.completionsModelSmall) {
      sizes.push(LLMModelSize.SMALL);
    }

    if (this.completionsModelLarge) {
      sizes.push(LLMModelSize.LARGE);
    }

    return sizes;
  }
  

  /**
   * Send the content to the LLM for it to generate and return the content's embeddings.
   */
  public async generateEmbeddings(content: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.embeddingsModel) throw new Error(`Embeddings model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.runLLMTask(this.embeddingsModel, LLMInvocationPurpose.EMBEDDINGS, content, false, context);
  }


  /**
   * Send the prompt to the small context window LLM and retrieve the LLM's answer.
   */
  public async executeCompletionSmall(prompt: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.completionsModelSmall) throw new Error(`Small text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return this.runLLMTask(this.completionsModelSmall, LLMInvocationPurpose.COMPLETION, prompt, doReturnJSON, context);
  }


  /**
   * Send the prompt to the large context window LLM and retrieve the LLM's answer.
   */
  public async executeCompletionLarge(prompt: string, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMFunctionResponse> {
    if (!this.completionsModelLarge) throw new Error(`Large text model represented by ${this.constructor.name} does not exist - do not use this method`);
    return await this.runLLMTask(this.completionsModelLarge, LLMInvocationPurpose.COMPLETION, prompt, doReturnJSON, context);
  }


  // Unit test hooks into protected methods
  TEST_extractTokensAmountAndLimitFromErrorMsg = this.extractTokensAmountAndLimitFromErrorMsg;
  TEST_extractTokensAmountFromMetadataOrGuessFromContent = this.extractTokensAmountFromMetadataOrGuessFromContent;
}  


export default AbstractLLM;