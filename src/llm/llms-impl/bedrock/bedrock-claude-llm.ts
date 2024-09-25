import { llmConst } from "../../../types/llm-constants";
import { llmModels, AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_CLAUDE_V35 } 
       from "../../../types/llm-models";
import { LLMImplSpecificResponseSummary } from "../llm-impl-types";
import BaseBedrockLLM from "./base-bedrock-llm";
const AWS_ANTHROPIC_API_VERSION = "bedrock-2023-05-31"


/** 
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 *
 */
class BedrockClaudeLLM extends BaseBedrockLLM {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      null,
      AWS_COMPLETIONS_MODEL_CLAUDE_V35,
    ); 
  }


  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(model: string, prompt: string): string {
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
      temperature: llmConst.ZERO_TEMP,
      top_p: llmConst.TOP_P_LOWEST,
      top_k: llmConst.TOP_K_LOWEST,
      max_tokens: llmModels[model].maxTotalTokens,
    });
  }


  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: unknown): LLMImplSpecificResponseSummary {
    const responseObj = llmResponse as ClaudeCompletionLLMSpecificResponse;
    const responseContent = responseObj?.content?.[0]?.text ?? "";
    const finishReason = responseObj?.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "length") 
      || !responseContent); // No content - assume prompt maxed out total tokens available
    const promptTokens = responseObj?.usage?.input_tokens ?? -1;
    const completionTokens = responseObj?.usage?.output_tokens ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


/**
 * Type definitions for the Claude specific completions LLM response usage.
 */
type ClaudeCompletionLLMSpecificResponse = {
  content?: { text: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};


export default BedrockClaudeLLM;
