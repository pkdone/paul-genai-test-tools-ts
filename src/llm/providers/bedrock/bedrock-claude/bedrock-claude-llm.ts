import llmConfig from "../../../../config/llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";

/** 
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 */
class BedrockClaudeLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return "BedrockClaude";
  }    
    
  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: string, prompt: string) {
    return JSON.stringify({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      temperature: llmConfig.ZERO_TEMP,
      top_p: llmConfig.TOP_P_LOWEST,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: ClaudeCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.content?.[0]?.text ?? "";
    const finishReason = llmResponse.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = (finishReasonLowercase === "max_tokens") || (!responseContent);
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

// Type definitions for the Claude specific completions LLM response usage.
interface ClaudeCompletionLLMSpecificResponse {
  content?: { text?: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export default BedrockClaudeLLM;
