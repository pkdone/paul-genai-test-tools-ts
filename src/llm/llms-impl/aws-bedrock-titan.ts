import { InvokeModelCommandInput } from "@aws-sdk/client-bedrock-runtime";
import { llmConst } from "../../types/llm-constants";
import { llmModels, AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1, 
         MODEL_NOT_SPECIFIED } from "../../types/llm-models";
import { LLMPurpose } from "../../types/llm-types";
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
   * Assemble the AWS Bedrock API parameters structure for Titan models and prompt.
   */
  protected buildFullLLMParameters(taskType: LLMPurpose, model: string, prompt: string): InvokeModelCommandInput {
    let body = "";    

    if (taskType === LLMPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
      });
    } else {
      const maxTokenCount = llmModels[model].maxTotalTokens;      
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
    };
  }  
}


export default AWSBedrockTitan;