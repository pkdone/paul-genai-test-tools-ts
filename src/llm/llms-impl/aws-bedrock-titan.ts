import { llmConst } from "../../types/llm-constants";
import { LLMInvocationPurpose } from "../../types/llm-types";
import {AbstractAWSBedrock, BedrockParams } from "./abstract-aws-bedrock";


/**
 * Class for the AWS Bedrock Titan service.
 */
class AWSBedrockTitan extends AbstractAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      llmConst.AWS_API_EMBEDDINGS_MODEL,
      llmConst.AWS_API_COMPLETIONS_MODEL_SMALL_TITAN,
      null,
      llmConst.AWS_API_EMBEDDINGS_MODEL,
      llmConst.AWS_API_COMPLETIONS_MODEL_SMALL_TITAN,
      llmConst.MODEL_NOT_SPECIFIED
    );
  }


  /**
   * Assemble the AWS Bedrock API parameters structure for Titan models and prompt.
   */
  protected buildFullLLMParameters(taskType: LLMInvocationPurpose, model: string, prompt: string): BedrockParams {
    const maxTokenCount = (model === this.completionsModelSmall) ? 
                          llmConst.MODEL_8K_MAX_OUTPUT_TOKENS : 
                          llmConst.MODEL_32K_MAX_OUTPUT_TOKENS;
    let body = "";    

    if (taskType === LLMInvocationPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
      });
    } else {
      body = JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          temperature: llmConst.ZERO_TEMP,
          topP: llmConst.TOP_P_VLOW,
          maxTokenCount,
        },
      });
    }

    return  { 
      modelId: model,
      contentType: llmConst.RESPONSE_JSON_CONTENT_TYPE,
      accept: llmConst.RESPONSE_ANY_CONTENT_TYPE,
      body, 
    };;
  }  
}


export default AWSBedrockTitan;