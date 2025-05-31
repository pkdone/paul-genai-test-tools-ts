import { OpenAI } from "openai";
import { LLMPurpose } from "../../../types/llm.types";
import { LLMImplSpecificResponseSummary } from "../llm-provider.types";
import AbstractLLM from "../base/abstract-llm";

/**
 * Abstract base class for all OpenAI-based LLM providers.
 */
abstract class BaseOpenAILLM extends AbstractLLM {

  /**
   * Execute the prompt against the LLM and return the relevant summary of the LLM's answer.
   */
  protected async invokeImplementationSpecificLLM(taskType: LLMPurpose, modelKey: string, prompt: string): Promise<LLMImplSpecificResponseSummary> {    
    const fullParameters = this.buildFullLLMParameters(taskType, modelKey, prompt);

    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.invokeEmbeddingsLLM(fullParameters as OpenAI.EmbeddingCreateParams);
    } else {
      return this.invokeCompletionLLM(fullParameters as OpenAI.Chat.ChatCompletionCreateParams);
    }
  }

  /**
   * Check if an error indicates the LLM is overloaded.
   */
  protected isLLMOverloaded(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("rate limit") || 
             message.includes("too many requests") ||
             message.includes("429") ||
             message.includes("503");
    }
    return false;
  }

  /**
   * Check if an error indicates token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("maximum context length") ||
             message.includes("token limit") ||
             message.includes("too long");
    }
    return false;
  }

  /**
   * Invoke embeddings LLM with the given parameters.
   */
  private async invokeEmbeddingsLLM(params: OpenAI.EmbeddingCreateParams): Promise<LLMImplSpecificResponseSummary> {
    const client = this.getClient();
    const llmResponse = await client.embeddings.create(params);

    // Extract response content
    const responseContent = llmResponse.data[0].embedding;

    // Capture finish reason
    const isIncompleteResponse = responseContent.length === 0;

    // Capture token usage
    const promptTokens = llmResponse.usage.prompt_tokens;
    const completionTokens = -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };

    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Invoke completion LLM with the given parameters.
   */
  private async invokeCompletionLLM(params: OpenAI.Chat.ChatCompletionCreateParams): Promise<LLMImplSpecificResponseSummary> {
    const client = this.getClient();
    const llmResponse = await client.chat.completions.create(params) as OpenAI.Chat.ChatCompletion;

    // Extract response content
    const responseContent = llmResponse.choices[0].message.content ?? "";

    // Capture finish reason
    const finishReason = llmResponse.choices[0].finish_reason;
    const isIncompleteResponse = finishReason === "length" || !responseContent;

    // Capture token usage
    const promptTokens = llmResponse.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponse.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };

    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Abstract method to get the OpenAI client instance.
   */
  protected abstract getClient(): OpenAI;

  /**
   * Abstract method to build LLM parameters for the specific provider.
   */
  protected abstract buildFullLLMParameters(taskType: LLMPurpose, modelKey: string, prompt: string): 
    OpenAI.EmbeddingCreateParams | OpenAI.Chat.ChatCompletionCreateParams;
}

export default BaseOpenAILLM;
