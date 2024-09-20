import { LLMImplResponseSummary } from "../../types/llm-types";
import { llmConst } from "../../types/llm-constants";
import { llmModels, AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1, 
         MODEL_NOT_SPECIFIED } from "../../types/llm-models";
import BaseAWSBedrock from "./base-aws-bedrock";


/**
 * Class for the AWS Bedrock Titan service.
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
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1,
      MODEL_NOT_SPECIFIED
    );
  }


  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(model: string, body: string, prompt: string): string {
    return JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        temperature: llmConst.ZERO_TEMP,
        topP: llmConst.TOP_P_VLOW,
        maxTokenCount: llmModels[model].maxTotalTokens,
      },
    });
  }

  
  /**
   * Extract the relevant information from the LLM specific response.
   */
  protected extractModelSpecificResponseMetadata(llmResponse: any): LLMImplResponseSummary {
    const responseContent = llmResponse?.embedding // Titan embeddings
      || llmResponse?.results?.[0]?.outputText;    // Titan completion
    const finishReason = llmResponse?.results?.[0]?.completionReason // Titan completion            
      || "";                                                         // Titan embeddings
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = ((finishReasonLowercase === "max_tokens") // Titan completion
      || !responseContent);                                                // No content - assume prompt maxed out total tokens available
    const promptTokens = llmResponse?.inputTextTokenCount ?? -1;
    const completionTokens = llmResponse?.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


export default AWSBedrockTitan;