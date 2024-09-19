import { llmConst } from "../../types/llm-constants";
import { llmModels, AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_CLAUDE_V35, MODEL_NOT_SPECIFIED } 
       from "../../types/llm-models";
import BaseAWSBedrock from "./base-aws-bedrock";


/** 
 * Class for the AWS Bedrock [Anthropic] Claude service.
 *
 */
class AWSBedrockClaude extends BaseAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      null,
      AWS_COMPLETIONS_MODEL_CLAUDE_V35,
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      MODEL_NOT_SPECIFIED,
      AWS_COMPLETIONS_MODEL_CLAUDE_V35
    ); 
  }


  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParamters(model: string, body: string, prompt: string): string {
    return JSON.stringify({
      anthropic_version: llmConst.AWS_ANTHROPIC_API_VERSION,
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
      max_tokens: llmModels[model].maxTotalTokens,
    });
  }
}


export default AWSBedrockClaude;
