import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getEnvVar } from "../../utils/envvar-utils";
import envConst from "../../types/env-constants";
import { llmConst, BEDROCK_ERROR_MSG_TOKENS_PATTERNS } from "../../types/llm-constants";
import { LLMInvocationPurpose, LLMResponseStatus, LLMModelSizeNames, LLMContext, LLMError, LLMFunctionResponse } from "../../types/llm-types";
import AbstractLLM from "./abstract-llm";
const UTF8_ENCODING = "utf8";


/**
 * Type to define the Bedrock API parameters
 */ 
export type BedrockParams = {
  modelId: any,
  contentType: string
  accept: string
  body: string,
};


/**
 * Class for the public AWS Bedrock service (multiple possible LLMs)
 */
export abstract class AbstractAWSBedrock extends AbstractLLM {
  // Private fields
  private embeddingsModelName: string;
  private completionsModelSmallName: string;
  private completionsModelLargeName: string;
  private client: BedrockRuntimeClient;


  /**
   * Constructor.
   */
  constructor(embeddingsModel: string, completionsModelSmall: string | null, completionsModelLarge: string | null, embeddingsModelName: string, completionsModelSmallName: string, completionsModelLargeName: string) { 
    super(embeddingsModel, completionsModelSmall,completionsModelLarge );
    this.embeddingsModelName = embeddingsModelName;
    this.completionsModelSmallName = completionsModelSmallName;
    this.completionsModelLargeName = completionsModelLargeName;
    this.client = new BedrockRuntimeClient([{
      region: getEnvVar<string>(envConst.ENV_AWS_API_REGION),
      apiVersion: llmConst.AWS_API_VERSION,
    }]);
  }

  
  /**
   * Abstract method to be overriden. Assemble the AWS Bedrock API parameters structure for the 
   * specific models and prompt.
   */
  protected abstract buildFullLLMParameters(taskType: LLMInvocationPurpose, model: string, prompt: string): BedrockParams;


  /**
   * Call close on underlying LLM client library to release resources.
   */ 
  public async close(): Promise<void> {
    try {
      this.client.destroy();
    } catch (error: unknown) {
      const baseError = error as Error;
      console.error("Error when calling destroy on AWSBedroc LLM", baseError, baseError.stack);
    }
  }


  /**
   * Get the names of the models this plug-in provides.
   */ 
  public getModelsNames(): LLMModelSizeNames {
    return {
      embeddings: this.embeddingsModelName,
      small: this.completionsModelSmallName,
      large: this.completionsModelLargeName,
    };
  }  


  /**
   * Execute the prompt against the LLM and return the LLM's answer.
   */
  protected async runLLMTask(model: string, taskType: LLMInvocationPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse> {
    let result = { status: LLMResponseStatus.UNKNOWN, request: prompt, context };

    try {
      const fullParameters = this.buildFullLLMParameters(taskType, model, prompt);
      const command = new InvokeModelCommand(fullParameters);
      const rawResponse = await this.client.send(command);
      
      // NOTE: `rawResponse["$metadata"]?.httpStatusCode` shows the response status code. However,
      //  this always seems to be 200. Other codes like 400 or 429 only appear in the `error`
      //  object thrown by the API, so only accessible from the catch block below.

      if (!rawResponse?.body) throw new Error("LLM response was empty");
      const llmResponse = JSON.parse(Buffer.from(rawResponse.body).toString(UTF8_ENCODING));
      const stopReason = llmResponse?.stop_reason || llmResponse?.results?.[0]?.completionReason;
      const responseContent = llmResponse.embedding || llmResponse?.completion || llmResponse?.content?.[0]?.text || llmResponse?.results[0]?.outputText;

      if (stopReason === "max_tokens" || stopReason === "LENGTH" || !responseContent) {
        const promptTokens = llmResponse?.inputTextTokenCount || llmResponse?.usage?.input_tokens;
        const completionTokens = llmResponse?.results?.[0]?.tokenCount || llmResponse?.usage?.output_tokens;
        Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage: this.extractTokensAmountFromMetadataOrGuessFromContent(model, prompt, responseContent, promptTokens, completionTokens, null) });  
      } else if (this.isLLMOverloaded(taskType, responseContent)) {
        Object.assign(result, { status: LLMResponseStatus.OVERLOADED });  
      } else {
        result = this.postProcessAsJSONIfNeededGettingNewResult(result, model, taskType, responseContent, doReturnJSON);          
      }
    } catch (error: unknown) {
      const baseError = error as Error;

      if (this.isTokenLimitExceeded(baseError)) {
        Object.assign(result, {status: LLMResponseStatus.EXCEEDED, tokensUage: this.extractTokensAmountAndLimitFromErrorMsg(model, BEDROCK_ERROR_MSG_TOKENS_PATTERNS, baseError.toString()) });
      } else if (this.isLLMOverloaded(taskType, null, baseError)) {
        Object.assign(result, { status: LLMResponseStatus.OVERLOADED });  
      } else {
        throw error;
      }
    }
    
    return result;
  }


  /**
   * See if the contents of the responses indicate inability to fully process request due to 
   * overloading.
   */
  private isLLMOverloaded(taskType: LLMInvocationPurpose, responseContent : string | null, error: Error | null = null): boolean {  
    if (taskType === LLMInvocationPurpose.COMPLETION) {    
      const firstPartLowerResponse = responseContent
                                  ? (responseContent.substring(0, 100).toLowerCase())
                                  : "";
      const lowerErrorMSg = error
                          ? (error.toString().toLowerCase())
                          : "";
      const blankError = error as unknown;
      const llmError = blankError as LLMError;                                            
      return (llmError?.code === 429) ||
             (llmError?.code === "429") || 
             (llmError?.["$metadata"]?.httpStatusCode === 429) ||
             (firstPartLowerResponse.includes("unable to respond")) ||
             (lowerErrorMSg.includes("timed out"));
    } else {
      return false;
    } 
  }


  /**
   * Check to see if error code indicates potential token limit has been execeeded
   */
  private isTokenLimitExceeded(error: Error): boolean {
    const lowercaseContent = error.toString().toLowerCase();      
    return lowercaseContent.includes("too many input tokens") ||
           lowercaseContent.includes("expected maxlength");
  }
}
