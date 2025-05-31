import llmConfig from "../../../../config/llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_DEEPSEEK } from "./bedrock-deepseek.manifest";

/** 
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 */
class BedrockDeepseekLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_DEEPSEEK;
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
  protected extractCompletionModelSpecificResponse(llmResponse: DeepseekCompletionLLMSpecificResponse) {
    const responseMsg = llmResponse.choices?.[0]?.message;
    const responseContent = responseMsg?.content ?? responseMsg?.reasoning_content ?? null;
    const finishReason = llmResponse.choices?.[0]?.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = (finishReasonLowercase === "length") || (!responseContent);
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Deepseek specific completions LLM response usage.
 */
interface DeepseekCompletionLLMSpecificResponse {
  choices?: [{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
    stop_reason?: string;
  }];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  }
}
export default BedrockDeepseekLLM;
