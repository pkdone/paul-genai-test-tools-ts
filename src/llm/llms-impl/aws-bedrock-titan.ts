import { LLMImplSpecificResponseSummary } from "../../types/llm-types";
import { llmConst } from "../../types/llm-constants";
import { llmModels, AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1 }
       from "../../types/llm-models";
import BaseAWSBedrock from "./base-aws-bedrock";


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


/**
 * Class for the AWS Bedrock Titan LLMs.
 */
class AWSBedrockTitan extends BaseAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1,
      null,
    );
  }


  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(model: string, prompt: string): string {
    return JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        temperature: llmConst.ZERO_TEMP,
        topP: llmConst.TOP_P_VLOW,
        maxTokenCount: llmModels[model].maxCompletionTokens,
      },
    });
  }

  
  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: unknown): LLMImplSpecificResponseSummary {
    const responseObj = llmResponse as TitanCompletionLLMSpecificResponse;
    const responseContent = responseObj?.results?.[0]?.outputText ?? ""; 
    const finishReason = responseObj?.results?.[0]?.completionReason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "max_tokens")
      || !responseContent);  // No content - assume prompt maxed out total tokens available
    const promptTokens = responseObj?.inputTextTokenCount ?? -1;
    const completionTokens = responseObj?.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


export default AWSBedrockTitan;