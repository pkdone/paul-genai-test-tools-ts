import { llmModels, llmConst } from "../../../types/llm-constants";
import { ModelKey } from "../../../types/llm-types";
import { LLMImplSpecificResponseSummary } from "../llm-impl-types";
import BaseBedrockLLM from "./base-bedrock-llm";


/**
 * Class for the AWS Bedrock Titan LLMs.
 */
class BedrockTitanLLM extends BaseBedrockLLM {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      ModelKey.AWS_EMBEDDINGS_TITAN_V1,
      ModelKey.AWS_COMPLETIONS_TITAN_EXPRESS_V1,
      null,
    );
  }


  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: ModelKey, prompt: string): string {
    return JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        temperature: llmConst.ZERO_TEMP,
        topP: llmConst.TOP_P_VLOW,
        maxTokenCount: llmModels[modelKey].maxCompletionTokens,
      },
    });
  }

  
  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: TitanCompletionLLMSpecificResponse): LLMImplSpecificResponseSummary {
    const responseContent = llmResponse?.results?.[0]?.outputText ?? ""; 
    const finishReason = llmResponse?.results?.[0]?.completionReason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "max_tokens")
      || !responseContent);  // No content - assume prompt maxed out total tokens available
    const promptTokens = llmResponse?.inputTextTokenCount ?? -1;
    const completionTokens = llmResponse?.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


/**
 * Type definitions for the Titan specific completions LLM response usage.
 */
type TitanCompletionLLMSpecificResponse = {
  results?: {
    outputText?: string;
    completionReason?: string;
    tokenCount?: number;
  }[];
  inputTextTokenCount?: number;
};


export default BedrockTitanLLM;