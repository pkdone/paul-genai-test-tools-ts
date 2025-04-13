import { llmModels, llmConst, modelMappings } from "../../../types/llm-constants";
import { ModelKey } from "../../../types/llm-types";
import BaseBedrockLLM from "./base-bedrock-llm";

/** 
 * Class for the AWS Bedrock Mistral LLMs.
 *
 */
class BedrockMistralLLM extends BaseBedrockLLM {
  /**
   * Constructor.
   */
  constructor() { 
    super(modelMappings.AWS_MISTRAL_EMBEDDINGS_MODEL_KEY, modelMappings.AWS_MISTRAL_COMPLETIONS_MODELS_KEYS); 
  }

  /**
   * Assemble the Bedrock parameters for Mistral completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: ModelKey, prompt: string) {
    return JSON.stringify({
      prompt: `<s>[INST] ${prompt} [/INST]`,
      temperature: llmConst.ZERO_TEMP,
      top_p: llmConst.TOP_P_LOWEST,
      top_k: llmConst.TOP_K_LOWEST,
      max_tokens: llmModels[modelKey].maxCompletionTokens,
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
      || !responseContent); // No content - assume prompt maxed out total tokens available
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };  // Mistral doesn't provide token counts (on Bedrock at least)
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Mistral specific completions LLM response usage.
 */
interface MistralCompletionLLMSpecificResponse {
  outputs?: {
    text?: string;
    stop_reason?: string;
  }[];
}

export default BedrockMistralLLM;
