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
      messages: [
        {
          role: "user",
          content: prompt,
        }
      ],
      temperature: llmConfig.ZERO_TEMP,
      top_p: llmConfig.TOP_P_LOWEST,
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: MistralCompletionLLMSpecificResponse) {
    const firstResponse = llmResponse.choices[0];
    const responseContent = firstResponse.message?.content ?? null;
    const finishReason = firstResponse.stop_reason ?? firstResponse.finish_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = (finishReasonLowercase === "length") || (!responseContent);
    const promptTokens = llmResponse.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponse.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Mistral specific completions LLM response usage.
 */
interface MistralCompletionLLMSpecificResponse {
  choices: [{
    message?: {
      content: string;
    };
    stop_reason?: string;
    finish_reason?: string;
  }];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  }
}

export default BedrockMistralLLM;
