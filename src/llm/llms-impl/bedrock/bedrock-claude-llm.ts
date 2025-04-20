import { llmModels, llmConst, modelMappings } from "../../../types/llm-constants";
import { ModelKey } from "../../../types/llm-types";
import BaseBedrockLLM from "./base-bedrock-llm";

/** 
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 *
 */
class BedrockClaudeLLM extends BaseBedrockLLM {
  /**
   * Constructor.
   */
  constructor() { 
    super(modelMappings.AWS_CLAUDE_EMBEDDINGS_MODEL_KEY, modelMappings.AWS_CLAUDE_COMPLETIONS_MODELS_KEYS); 
  }

  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: ModelKey, prompt: string) {
    return JSON.stringify({
      anthropic_version: llmConst.AWS_ANTHROPIC_API_VERSION,
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
      temperature: llmConst.ZERO_TEMP,
      top_p: llmConst.TOP_P_LOWEST,
      top_k: llmConst.TOP_K_LOWEST,
      max_tokens: llmModels[modelKey].maxTotalTokens,
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
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

// Type definitions for the Claude specific completions LLM response usage.
interface ClaudeCompletionLLMSpecificResponse {
  content?: { text: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export default BedrockClaudeLLM;
