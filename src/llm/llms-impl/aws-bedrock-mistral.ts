import { LLMImplResponseSummary } from "../../types/llm-types";
import { llmConst } from "../../types/llm-constants";
import { AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_MISTRAL_LARGE,
         AWS_COMPLETIONS_MODEL_MISTRAL_LARGE2, 
         llmModels} from "../../types/llm-models";
import BaseAWSBedrock from "./base-aws-bedrock";


/** 
 * Class for the AWS Bedrock Mistral LLMs.
 *
 */
class AWSBedrockMistral extends BaseAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      AWS_COMPLETIONS_MODEL_MISTRAL_LARGE,
      AWS_COMPLETIONS_MODEL_MISTRAL_LARGE2,
    ); 
  }


  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(model: string, body: string, prompt: string): string {
    return JSON.stringify({
      prompt: `<s>[INST] ${prompt} [/INST]`,
      temperature: llmConst.ZERO_TEMP,
      top_p: llmConst.TOP_P_LOWEST,
      top_k: llmConst.TOP_K_LOWEST,
      max_tokens: llmModels[model].maxCompletionTokens,
    });
  }


  /**
   * Extract the relevant information from the LLM specific response.
   */
  protected extractModelSpecificResponseMetadata(llmResponse: any): LLMImplResponseSummary {
    const responseContent = llmResponse?.embedding // Titan embeddings
      || llmResponse?.outputs?.[0]?.text;          // Mistral completion
    const finishReason = llmResponse?.outputs?.[0]?.stop_reason // Mistral completion
      || "";                                                    // Titan embeddings
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "length") // Mistral completion
      || !responseContent);                                            // No content - assume prompt maxed out total tokens available
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };  // Mistral doesn't provide token counts (on Bedrock at least)
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


export default AWSBedrockMistral;
