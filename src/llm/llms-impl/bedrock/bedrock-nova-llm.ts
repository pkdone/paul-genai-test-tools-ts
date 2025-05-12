import { llmConst } from "../../../types/llm-constants";
import { ModelFamily, ModelKey } from "../../../types/llm-models-metadata";
import BaseBedrockLLM from "./base-bedrock-llm";

/** 
 * Class for the AWS Bedrock [Anthropic] Nova LLMs.
 */
class BedrockNovaLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): ModelFamily {
    return ModelFamily.BEDROCK_NOVA_MODELS;
  }    
    
  /**
   * Assemble the Bedrock parameters for Nova completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: ModelKey, prompt: string) {
    return JSON.stringify({
      inferenceConfig: {
        max_new_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
        temperature: llmConst.ZERO_TEMP,
        top_p: llmConst.TOP_P_LOWEST,
        top_k: llmConst.TOP_K_LOWEST,
      },      
      messages: [
        {
          role: "user",
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: NovaCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.output.message?.content?.[0]?.text ?? null;
    const finishReason = llmResponse.stopReason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = (finishReasonLowercase === "max_tokens") || (!responseContent);
    const promptTokens = llmResponse.usage?.inputTokens ?? -1;
    const completionTokens = llmResponse.usage?.outputTokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

// Type definitions for the Nova specific completions LLM response usage.
interface NovaCompletionLLMSpecificResponse {
  output: {
    message?: {
      content?: [
        {
          text: string;
        }
      ];
    };
  };
  stopReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  }
}

export default BedrockNovaLLM;
