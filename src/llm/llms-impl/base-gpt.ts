import { OpenAI, RateLimitError, InternalServerError, BadRequestError, AuthenticationError, 
         PermissionDeniedError, NotFoundError, UnprocessableEntityError } from "openai";
import { LLMPurpose, LLMImplResponseSummary } from "../../types/llm-types";
import AbstractLLM from "../abstract-llm";
import { APIError } from "openai/error";


/**
 * Abstract class for GPT managed LLM provider services (subclasses might be OpenAI or Azure
 * implementations).
 */
abstract class BaseGPT extends AbstractLLM {
  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected abstract getClient(): OpenAI;

  
  /**
   * Abstract method to assemble the OpenAI API parameters structure for the given model and prompt.
   */
  protected abstract buildFullLLMParameters(taskType: string, model: string, prompt: string): OpenAI.EmbeddingCreateParams | OpenAI.Chat.ChatCompletionCreateParams;


  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeLLMSpecificLLMSummarizingItsResponse(taskType: LLMPurpose, model: string, prompt: string): Promise<LLMImplResponseSummary> {
    // Invoke LLM
    const params = this.buildFullLLMParameters(taskType, model, prompt);    
    const llmResponses: any = (taskType === LLMPurpose.EMBEDDINGS)
      ? await this.runGPTGetEmbeddings(params as OpenAI.EmbeddingCreateParams)
      : await this.runGPTGetCompletion(params as OpenAI.Chat.ChatCompletionCreateParams);
    const llmResponse = llmResponses?.data?.[0] ?? llmResponses?.choices?.[0];

    // Capture response content
    const responseContent = llmResponse.embedding || llmResponse.message?.content;

    // Capture finish reason
    const finishReason = llmResponse?.finishReason ?? llmResponse?.finish_reason;
    const isIncompleteResponse = (finishReason === "length") || (!responseContent);

    // Capture token usage 
    const promptTokens = llmResponses.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponses.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  /**
   * Invoke the actuall LLM's embedding API directly.
   */ 
  protected async runGPTGetEmbeddings(params: OpenAI.EmbeddingCreateParams): Promise<OpenAI.CreateEmbeddingResponse> {
    return this.getClient().embeddings.create(params);    
  }


  /**
   * Invoke the actuall LLM's completion API directly.
   */ 
  protected async runGPTGetCompletion(params: OpenAI.Chat.ChatCompletionCreateParams): Promise<OpenAI.ChatCompletion> {
    return this.getClient().chat.completions.create(params) as Promise<OpenAI.ChatCompletion>;
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
  private debugCurrentlyNonCheckedErrorTypes(error: unknown) {
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


export default BaseGPT;
