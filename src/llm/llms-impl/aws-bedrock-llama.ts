import { llmConst } from "../../types/llm-constants";
import { AWS_EMBEDDINGS_MODEL_TITAN_V1, AWS_COMPLETIONS_MODEL_LLAMA_V3_70B_INSTRUCT,
         AWS_COMPLETIONS_MODEL_LLAMA_V31_405B_INSTRUCT,
         llmModels} from "../../types/llm-models";
import BaseAWSBedrock from "./base-aws-bedrock";


/** 
 * Class for the AWS Bedrock [Anthropic] Claude service.
 *
 */
class AWSBedrockLlama extends BaseAWSBedrock {
  /**
   * Constructor.
   */
  constructor() { 
    super(
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      AWS_COMPLETIONS_MODEL_LLAMA_V3_70B_INSTRUCT,
      AWS_COMPLETIONS_MODEL_LLAMA_V31_405B_INSTRUCT,     
      AWS_EMBEDDINGS_MODEL_TITAN_V1,
      AWS_COMPLETIONS_MODEL_LLAMA_V3_70B_INSTRUCT,
      AWS_COMPLETIONS_MODEL_LLAMA_V31_405B_INSTRUCT,
    ); 
  }


  /**
   * Assemble the Bedrock parameters for Llama completions only.
   */
  protected buildCompletionModelSpecificParamters(model: string, body: string, prompt: string): string {
    const bodyObj: { prompt: string, temperature: number, top_p: number, max_gen_len?: number } = {
      prompt: 
`<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a helpful software engineering and programming assistant, and you need to answer the question given without attempting to fill in any blanks in the question<|eot_id|>
<|start_header_id|>user<|end_header_id|>${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
      temperature: llmConst.ZERO_TEMP,
      top_p: llmConst.TOP_P_LOWEST,
    };

    // Currently for v3 and lower Llama LLMs, getting this error even though left to their own devices they seem to happily default to max completions of 8192: Malformed input request: #/max_gen_len: 8192 is not less or equal to 2048, please reformat your input and try again. ValidationException: Malformed input request: #/max_gen_len: 8192 is not less or equal to 2048, please reformat your input and try again.
    if (model === AWS_COMPLETIONS_MODEL_LLAMA_V31_405B_INSTRUCT) {
      bodyObj.max_gen_len = llmModels[model].maxCompletionTokens;
    }

    return JSON.stringify(bodyObj);
  }
}


export default AWSBedrockLlama;
