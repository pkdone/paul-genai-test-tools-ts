import { GPT_ERROR_MSG_TOKENS_PATTERNS } from "../../types/llm-constants";
import { LLMInvocationPurpose, LLMFunctionResponse, LLMResponseStatus, LLMContext, LLMError }
  from "../../types/llm-types";
import AbstractLLM from "./abstract-llm";


/**
 * Abstract class for GPT managed LLM provider services (subclasses might be OpenAI or Azure
 * implementations).
 */
abstract class AbstractGPT extends AbstractLLM {
  /**
   * Abstract method to be overridden. Invoke the actual LLM's embedding API directly.
   */
  protected abstract runGPTGetEmbeddings(model: string, content: string): Promise<unknown>;


  /**
   * Abstract method to be overridden. Invoke the actual LLM's completion API directly.
   */
  protected abstract runGPTGetCompletion(model: string, prompt: string): Promise<unknown>;


  /**
   * Execute the prompt against the LLM and return the LLM's answer.
   */
  protected async runLLMTask(model: string, taskType: LLMInvocationPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse> {
    let result: LLMFunctionResponse = { status: LLMResponseStatus.UNKNOWN, request: prompt, context };
  
    try {
      let llmResponses: any = null;
      let llmResponse: any = null;

      if (taskType === LLMInvocationPurpose.EMBEDDINGS) {
        llmResponses = await this.runGPTGetEmbeddings(model, prompt);
        llmResponse = llmResponses?.data[0];
      } else {
        llmResponses = await this.runGPTGetCompletion(model, prompt);
        llmResponse = llmResponses?.choices[0];
      }

      if (!llmResponse) throw new Error("LLM response contained no choices with response messages");

      if (llmResponse?.finishReason === "length" || llmResponse?.finish_reason === "length") {
        Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage: llmResponses.usage });
      } else {
        const responseContent = (taskType === LLMInvocationPurpose.EMBEDDINGS) ? llmResponse.embedding : llmResponse.message?.content;
        const generated = this.postProcessResponseAsJSONIfNeeded(responseContent, doReturnJSON)
        Object.assign(result, { status: LLMResponseStatus.COMPLETED, generated });
      }
    } catch (error: unknown) {
      const baseError = error as Error;
      const llmError = error as LLMError;
  
      if (this.isLLMOverloaded(llmError)) {
        result.status = LLMResponseStatus.OVERLOADED;
      } else if (this.isTokenLimitExceeded(llmError)) {
        Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage: this.extractTokensAmountAndLimitFromErrorMsg(model, GPT_ERROR_MSG_TOKENS_PATTERNS, baseError.message) });
      } else {
        throw error;
      }
    }

    return result;
  }


  /**
   * See if an error object indicates a network issue or throttling event.
   */
  private isLLMOverloaded(llmError: LLMError): boolean {
    return llmError.code === 429 ||
           llmError.code === "429" || 
           llmError.status === 429 ||
           llmError.status === "429" ||            
           llmError.error?.code === "429" ||
           llmError.response?.status === 429;
  }


  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  private isTokenLimitExceeded(llmError: LLMError): boolean {
    return llmError.code === "context_length_exceeded" ||
           llmError.type === "invalid_request_error";
  }


  // Expose private methods for unit testing
  public TEST_isLLMOverloaded = this.isLLMOverloaded.bind(this);
  public TEST_isTokenLimitExceeded = this.isTokenLimitExceeded.bind(this);  
}


export default AbstractGPT;
