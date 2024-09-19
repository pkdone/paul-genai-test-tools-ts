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
  protected buildCompletionModelSpecificParamters(model: string, body: string, prompt: string): string {
    return JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        temperature: llmConst.ZERO_TEMP,
        topP: llmConst.TOP_P_VLOW,
        maxTokenCount: llmModels[model].maxTotalTokens,
      },
    });
  }
}


export default AWSBedrockTitan;