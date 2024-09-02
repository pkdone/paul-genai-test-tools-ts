import { llmConst } from "../../types/llm-constants";
import envConst from "../../types/env-constants";
import { getEnvVar } from "../../utils/envvar-utils";
import { LLMInvocationPurpose } from "../../types/llm-types";
import {AbstractAWSBedrock, BedrockParams } from "./abstract-aws-bedrock";


/** 
 * Class for the AWS Bedrock [Anthropic] Claude service.
 *
 */
class AWSBedrockClaude extends AbstractAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    const claudeCompletionsModelVersion = getEnvVar<number>(envConst.ENV_AWS_CLAUDE_MODEL_VERSION, 3);
    let completionsModel;
    
    if (claudeCompletionsModelVersion === 2) {
      completionsModel = llmConst.AWS_API_COMPLETIONS_MODEL_LARGE_CLAUDE2;
    } else if (claudeCompletionsModelVersion === 3.5) {
      completionsModel = llmConst.AWS_API_COMPLETIONS_MODEL_LARGE_CLAUDE35;
    } else {
      completionsModel = llmConst.AWS_API_COMPLETIONS_MODEL_LARGE_CLAUDE3;
    }

    super(
      llmConst.AWS_API_EMBEDDINGS_MODEL,
      null,
      completionsModel,
      llmConst.AWS_API_EMBEDDINGS_MODEL,
      llmConst.MODEL_NOT_SPECIFIED,
      completionsModel
    ); 
  }


  /**
   * Assemble the AWS Bedrock API parameters structure for Titan models and prompt.
   */
  protected buildFullLLMParameters(taskType: LLMInvocationPurpose, model: string, prompt: string): BedrockParams {
    const maxTokenCount = llmConst.MODEL_100K_MAX_OUTPUT_TOKENS;
    let body = "";

    if (taskType === LLMInvocationPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
      });
    } else {
      body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        temperature: llmConst.ZERO_TEMP,
        top_p: llmConst.TOP_P_LOWEST,
        top_k: llmConst.TOP_K_LOWEST,
        max_tokens: maxTokenCount,
      });
    }
    
    return { 
      modelId: model,
      contentType: llmConst.RESPONSE_JSON_CONTENT_TYPE,
      accept: llmConst.RESPONSE_ANY_CONTENT_TYPE,
      body,       
    };
  }  
}


export default AWSBedrockClaude;
