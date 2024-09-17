import { LLMPurpose, LLMImplResponseSummary } from "../../types/llm-types";
import AbstractLLM from "../abstract-llm";


/**
 * Abstract class for GPT managed LLM provider services (subclasses might be OpenAI or Azure
 * implementations).
 */
abstract class BaseGPT extends AbstractLLM {
  /**
   * Abstract method to be overridden. Invoke the actual LLM's embedding API directly.
   */
  protected abstract runGPTGetEmbeddings(model: string, content: string): Promise<unknown>;


  /**
   * Abstract method to be overridden. Invoke the actual LLM's completion API directly.
   */
  protected abstract runGPTGetCompletion(model: string, prompt: string): Promise<unknown>;

  /**
   * See if an error object indicates a network issue or throttling event.
   */
  protected abstract isLLMOverloaded(error: unknown): boolean;

  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected abstract isTokenLimitExceeded(error: unknown): boolean;


  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeLLMSummarizingResponse(taskType: LLMPurpose, model: string, prompt: string): Promise<LLMImplResponseSummary> {
    // Invoke LLM
    const llmResponses: any = (taskType === LLMPurpose.EMBEDDINGS)
      ? await this.runGPTGetEmbeddings(model, prompt)
      : await this.runGPTGetCompletion(model, prompt);
    const llmResponse = llmResponses?.data?.[0] ?? llmResponses?.choices?.[0];

    // Capture response content
    const responseContent = llmResponse.embedding || llmResponse.message?.content;

    // Capture response reason
    const finishReason = llmResponse?.finishReason ?? llmResponse?.finish_reason;
    const isIncompleteResponse = (finishReason === "length") || (!responseContent);

    // Capture token usage  (for 3 settings below, first option is AzureGPT, second is OpenAI)
    const promptTokens = llmResponses.usage?.promptTokens ?? llmResponses.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponses.usage?.completionTokens ?? llmResponses.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "llmResponses.usage?.totalTokens" or "llmResponses.usage?.total_tokens" as that is total of prompt + cpompletion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  // Expose private methods for unit testing
  public TEST_isLLMOverloaded = this.isLLMOverloaded.bind(this);
  public TEST_isTokenLimitExceeded = this.isTokenLimitExceeded.bind(this);  
}


export default BaseGPT;
