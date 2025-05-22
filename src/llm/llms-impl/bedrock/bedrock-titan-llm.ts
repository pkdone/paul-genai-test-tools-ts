import { llmConfig } from "../../../config/llm.config";
import { ModelFamily, ModelKey } from "../../../types/llm-models-metadata";
import BaseBedrockLLM from "./base-bedrock-llm";

/**
 * Class for the AWS Bedrock Titan LLMs.
 */
class BedrockTitanLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): ModelFamily {
    return ModelFamily.BEDROCK_TITAN_MODELS;
  }    
    
  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: ModelKey, prompt: string) {
    return JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        temperature: llmConfig.ZERO_TEMP,
        topP: llmConfig.TOP_P_VLOW,
        maxTokenCount: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      },
    });
  }
  
  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: TitanCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.results?.[0]?.outputText ?? ""; 
    const finishReason = llmResponse.results?.[0]?.completionReason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "max_tokens")
      || !responseContent);  // No content - assume prompt maxed out total tokens available
    const promptTokens = llmResponse.inputTextTokenCount ?? -1;
    const completionTokens = llmResponse.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Titan specific completions LLM response usage.
 */
interface TitanCompletionLLMSpecificResponse {
  results?: {
    outputText?: string;
    completionReason?: string;
    tokenCount?: number;
  }[];
  inputTextTokenCount?: number;
}

export default BedrockTitanLLM;