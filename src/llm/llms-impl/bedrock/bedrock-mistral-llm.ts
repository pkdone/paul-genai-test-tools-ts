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
      messages: [
        {
          role: "user",
          content: prompt,
        }
      ],
      temperature: llmConst.ZERO_TEMP,
      top_p: llmConst.TOP_P_LOWEST,
      max_tokens: llmModels[modelKey].maxCompletionTokens,
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

// Type definitions for the Mistral specific completions LLM response usage.
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
