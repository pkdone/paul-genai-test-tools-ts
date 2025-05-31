import llmConfig from "../../../../config/llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_CLAUDE } from "./bedrock-claude.manifest";

// Constants
const AWS_ANTHROPIC_API_VERSION ="bedrock-2023-05-31";

/** 
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 */
class BedrockClaudeLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_CLAUDE;
  }    
    
  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(modelInternalKey: string, prompt: string) {
    return JSON.stringify({
      anthropic_version: AWS_ANTHROPIC_API_VERSION,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: llmConfig.ZERO_TEMP,
      top_p: llmConfig.TOP_P_LOWEST,
      top_k: llmConfig.TOP_K_LOWEST,
      max_tokens: this.llmModelsMetadata[modelInternalKey].maxCompletionTokens,    
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: ClaudeCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.content?.[0]?.text ?? "";
    const finishReason = llmResponse.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "length") 
      || !responseContent); // No content - assume prompt maxed out total tokens available
    const promptTokens = llmResponse.usage?.input_tokens ?? -1;
    const completionTokens = llmResponse.usage?.output_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Claude specific completions LLM response usage.
 */
interface ClaudeCompletionLLMSpecificResponse {
  content?: { text: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export default BedrockClaudeLLM;
