import { InvokeModelCommandInput } from "@aws-sdk/client-bedrock-runtime";
import { llmConst } from "../../types/llm-constants";
import { llmModels, AWS_EMBEDDINGS_MODEL_TITAN_V1, ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35, MODEL_NOT_SPECIFIED } 
       from "../../types/llm-models";
import { LLMPurpose } from "../../types/llm-types";
import {AbstractAWSBedrock } from "./abstract-aws-bedrock";


/** 
 * Class for the AWS Bedrock [Anthropic] Claude service.
 *
 */
class AWSBedrockClaude extends AbstractAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      null,
      ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35,
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      MODEL_NOT_SPECIFIED,
      ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35
    ); 
  }


  /**
   * Assemble the AWS Bedrock API parameters structure for Titan models and prompt.
   */
  protected buildFullLLMParameters(taskType: LLMPurpose, model: string, prompt: string): InvokeModelCommandInput  {
    let body = "";

    if (taskType === LLMPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
      });
    } else {
      const maxTokenCount = llmModels[model].maxTotalTokens;
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
