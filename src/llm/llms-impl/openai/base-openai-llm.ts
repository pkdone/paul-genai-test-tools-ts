import { OpenAI, RateLimitError, InternalServerError, BadRequestError, AuthenticationError, 
         PermissionDeniedError, NotFoundError, UnprocessableEntityError } from "openai";
import { APIError } from "openai/error";
import { LLMPurpose } from "../../../types/llm-types";
import { LLMImplSpecificResponseSummary } from "../llm-impl-types";
import AbstractLLM from "../abstract-llm";


/**
 * Abstract class for GPT managed LLM provider services (subclasses might be OpenAI or Azure
 * implementations).
 */
abstract class BaseOpenAILLM extends AbstractLLM {
  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected abstract getClient(): OpenAI;

  
  /**
   * Abstract method to assemble the OpenAI API parameters structure for the given model and prompt.
   */
  protected abstract buildFullLLMParameters(taskType: string, model: string, prompt: string): OpenAI.EmbeddingCreateParams | OpenAI.ChatCompletionCreateParams;


  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeImplementationSpecificLLM(taskType: LLMPurpose, model: string, prompt: string): Promise<LLMImplSpecificResponseSummary> {
    const params = this.buildFullLLMParameters(taskType, model, prompt);    

    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.invokeImplementationSpecificEmbeddingsLLM(params as OpenAI.EmbeddingCreateParams);
    } else {
      return this.invokeImplementationSpecificCompletionLLM(params as OpenAI.ChatCompletionCreateParams);
    }
  }


  /**
   * Invoke the actuall LLM's embedding API directly.
   */ 
  protected async invokeImplementationSpecificEmbeddingsLLM(params: OpenAI.EmbeddingCreateParams): Promise<LLMImplSpecificResponseSummary> {
    // Invoke LLM
    const llmResponses = await this.getClient().embeddings.create(params);
    const llmResponse = llmResponses?.data?.[0];

    // Capture response content
    const responseContent = llmResponse.embedding;
    
    // Capture finish reason
    const isIncompleteResponse = (!responseContent);

    // Capture token usage 
    const promptTokens = llmResponses.usage?.prompt_tokens ?? -1;
    const completionTokens = -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  /**
   * Invoke the actuall LLM's completion API directly.
   */ 
  protected async invokeImplementationSpecificCompletionLLM(params: OpenAI.ChatCompletionCreateParams): Promise<LLMImplSpecificResponseSummary> {
    // Invoke LLM
    const llmResponses = (await this.getClient().chat.completions.create(params)) as OpenAI.ChatCompletion;
    const llmResponse = llmResponses?.choices?.[0];

    // Capture response content
    const responseContent = llmResponse.message?.content;

    // Capture finish reason
    const finishReason = llmResponse?.finish_reason ?? "";
    const isIncompleteResponse = (finishReason === "length") || (!responseContent);

    // Capture token usage 
    const promptTokens = llmResponses.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponses.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  /**
   * See if an error object indicates a network issue or throttling event.
   */
  protected isLLMOverloaded(error: unknown): boolean {
    // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error);
    return ((error instanceof RateLimitError) || (error instanceof InternalServerError));
  }


  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown): boolean {
    // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error);
    if (error instanceof APIError) {
      return error.code === "context_length_exceeded" ||
             error.type === "invalid_request_error";
    }

    return false;
  }


  /** 
   * Debug currently non-checked error types.
   */
  private debugCurrentlyNonCheckedErrorTypes(error: unknown): void {
    if (error instanceof BadRequestError) console.log("BadRequestError");
    if (error instanceof AuthenticationError) console.log("AuthenticationError");
    if (error instanceof RateLimitError) console.log("RateLimitError");
    if (error instanceof InternalServerError) console.log("InternalServerError");
    if (error instanceof PermissionDeniedError) console.log("PermissionDeniedError");
    if (error instanceof NotFoundError) console.log("NotFoundError");
    if (error instanceof UnprocessableEntityError) console.log("UnprocessableEntityError");
  }


  // Expose private methods for unit testing
  public TEST_isLLMOverloaded = this.isLLMOverloaded.bind(this);
  public TEST_isTokenLimitExceeded = this.isTokenLimitExceeded.bind(this);  
}


export default BaseOpenAILLM;