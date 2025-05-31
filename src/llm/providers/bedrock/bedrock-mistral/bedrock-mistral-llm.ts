import llmConfig from "../../../../config/llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";

/** 
 * Class for the AWS Bedrock Mistral LLMs.
 *
 */
class BedrockMistralLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return "BedrockMistral";
  }        

  /**
   * Assemble the Bedrock parameters for Mistral completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: string, prompt: string) {
    return JSON.stringify({
      prompt: `<s>[INST] ${prompt} [/INST]`,
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      temperature: llmConfig.ZERO_TEMP,
      top_p: llmConfig.TOP_P_LOWEST,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: MistralCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.outputs?.[0]?.text ?? "";
    const finishReason = llmResponse.outputs?.[0]?.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "length")
      || !responseContent);  // No content - assume prompt maxed out total tokens available
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

// Type definitions for the Mistral specific completions LLM response usage.
interface MistralCompletionLLMSpecificResponse {
  outputs?: {
    text?: string;
    stop_reason?: string;
  }[];
}

export default BedrockMistralLLM;
