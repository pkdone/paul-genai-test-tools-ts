import llmConfig from "../../../../config/llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";

/** 
 * Class for the AWS Bedrock Nova LLMs.
 */
class BedrockNovaLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return "BedrockNova";
  }    
    
  /**
   * Assemble the Bedrock parameters for Nova completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: string, prompt: string) {
    return JSON.stringify({
      prompt: prompt,
      maxTokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      temperature: llmConfig.ZERO_TEMP,
      topP: llmConfig.TOP_P_LOWEST,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: NovaCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.completions?.[0]?.data?.text ?? "";
    const finishReason = llmResponse.completions?.[0]?.finishReason?.reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "length")
      || !responseContent);  // No content - assume prompt maxed out total tokens available
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

// Type definitions for the Nova specific completions LLM response usage.
interface NovaCompletionLLMSpecificResponse {
  completions?: {
    data?: {
      text?: string;
    };
    finishReason?: {
      reason?: string;
    };
  }[];
}

export default BedrockNovaLLM;
