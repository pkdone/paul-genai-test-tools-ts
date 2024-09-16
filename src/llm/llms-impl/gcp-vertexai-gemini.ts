import { VertexAI, ModelParams, RequestOptions, FinishReason, HarmCategory, HarmBlockThreshold, 
         GoogleApiError, ClientError, GoogleAuthError, GoogleGenerativeAIError, 
         IllegalArgumentError } from "@google-cloud/vertexai";
import { getEnvVar } from "../../utils/envvar-utils";
import envConst from "../../types/env-constants";
import { llmConst, llmAPIErrorPatterns } from "../../types/llm-constants";
import { GCP_EMBEDDINGS_MODEL_ADA_GECKO, GCP_COMPLETIONS_MODEL_GEMINI_FLASH15, GCP_COMPLETIONS_MODEL_GEMINI_PRO15 } from "../../types/llm-models";
import { LLMPurpose, LLMConfiguredModelTypes, LLMContext,
         LLMFunctionResponse } from "../../types/llm-types";
import { getErrorText } from "../../utils/error-utils";
import AbstractLLM from "../abstract-llm";


// Constants
const VERTEXAI_TERMINAL_FINISH_REASONS = [FinishReason.BLOCKLIST, FinishReason.PROHIBITED_CONTENT, FinishReason.RECITATION, FinishReason.SAFETY, FinishReason.SPII];


/**
 * Class for the GCP Vertex AI Gemini service.
 */
class GcpVertexAIGemini extends AbstractLLM {
  // Private fields
  private readonly client: VertexAI;


  /**
   * Constructor
   */
  constructor() {
    super(GCP_EMBEDDINGS_MODEL_ADA_GECKO, GCP_COMPLETIONS_MODEL_GEMINI_FLASH15, GCP_COMPLETIONS_MODEL_GEMINI_PRO15);
    const project = getEnvVar<string>(envConst.ENV_GCP_API_PROJECTID);
    const location = getEnvVar<string>(envConst.ENV_GCP_API_LOCATION);
    this.client = new VertexAI({project, location});
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMConfiguredModelTypes {
    return {
      embeddings: GCP_EMBEDDINGS_MODEL_ADA_GECKO,
      regular: GCP_COMPLETIONS_MODEL_GEMINI_FLASH15,
      premium: GCP_COMPLETIONS_MODEL_GEMINI_PRO15,
    };
  }  


  /**
   * Execute the prompt against the LLM and return the LLM's answer.
   */
  protected async runLLMTask(model: string, taskType: LLMPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse> {
    try {
      // Invoke LLM
      const { modelParams, requestOptions } = this.buildFullLLMParameters(taskType, model);
      const llm = this.client.getGenerativeModel(modelParams, requestOptions);
      const llmResponses = await llm.generateContent(prompt);
      const usageMetadata = llmResponses?.response?.usageMetadata;
      const llmResponse = llmResponses?.response?.candidates?.[0];
      if (!llmResponse) throw new Error("LLM response was completely empty");

      // Capture response content
      const responseContent = llmResponse?.content?.parts?.[0]?.text ?? "";

      // Capture response reason
      const finishReason = llmResponse?.finishReason ?? FinishReason.OTHER;      
      if (VERTEXAI_TERMINAL_FINISH_REASONS.includes(finishReason)) throw new Error(`LLM response was not safely completed - reason given: ${finishReason}`);
      const isIncompleteResponse = ((finishReason !== FinishReason.STOP)) || (!responseContent);
      
      // Capture token usage
      const promptTokens = usageMetadata?.promptTokenCount ?? -1;
      const completionTokens = usageMetadata?.candidatesTokenCount ?? -1;
      const maxTotalTokens = -1;  // Not using "usageMetadata?.totalTokenCount" as that is total of prompt + cpompletion tokens tokens and not the max limit
      const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };

      // Process successful response
      return this.captureLLMResponseFromSuccessfulCall(prompt, context, isIncompleteResponse, model, responseContent, tokenUsage, taskType, doReturnJSON);
    } catch (error: unknown) {
      // Process error response
      return this.captureLLMResponseFromThrownError(error, prompt, context, model, llmAPIErrorPatterns.VERTEXAI_ERROR_MSG_TOKENS_PATTERNS);
    }
  }


  /**
   * Assemble the GCP API parameters structure for the given model and prompt.
   */
  private buildFullLLMParameters(taskType: string, model: string): { modelParams: ModelParams, requestOptions: RequestOptions } {
    const modelParams = { 
      model,
      generationConfig: { 
        candidateCount: 1,
        topP: llmConst.TOP_P_LOWEST,
        topK: llmConst.TOP_K_LOWEST,
        temperature: llmConst.ZERO_TEMP,   
        // maxOutputTokens: llmModels[model].maxTotalTokens,   // Can't set this cos GCP API hardcoded to low max tokens - errror: ClientError: [VertexAI.ClientError]: got status: 400 Bad Request. {"error":{"code":400,"message":"Unable to submit request because it has a maxOutputTokens value of 1048576 but the supported range is from 1 (inclusive) to 8193 (exclusive). Update the value and try again.","status":"INVALID_ARGUMENT"}}
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_UNSPECIFIED, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    };

    const requestOptions = {
      timeout: llmConst.REQUEST_WAIT_TIMEOUT_MILLIS,
    } as RequestOptions;

    return {modelParams, requestOptions};
  }


  /**
   * See if the respnse error indicated that the LLM was overloaded.
   */
  protected isLLMOverloaded(error: unknown): boolean {  
    // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error);

    if (error instanceof Error) {
      const errMsg = getErrorText(error).toLowerCase() || "";

      if ((error instanceof GoogleApiError) && 
          (error.code === 429)) {
        return true;
      }

      if ((error instanceof ClientError) && 
          (errMsg.includes("429 too many requests"))) {
        return true;
      }      

      if ((errMsg.includes("reason given: recitation")) ||
          (errMsg.includes("exception posting request to model"))) {
        return true;
      }
    }

    return false;
  }  


  /**
   * Check to see if error code indicates potential token limit has been execeeded - this should
   * not occur with error object thrown so always returns false
   */
  protected isTokenLimitExceeded(error: unknown): boolean {    
    return false;
  }  
  

  /** 
   * Debug currently non-checked error types.
   */
  private debugCurrentlyNonCheckedErrorTypes(error: unknown) {
    if (error instanceof GoogleApiError) console.log(`GoogleApiError ${getErrorText(error)}`);
    if (error instanceof ClientError) console.log(`ClientError ${getErrorText(error)}`);
    if (error instanceof GoogleAuthError) console.log(`GoogleAuthError ${getErrorText(error)}`);
    if (error instanceof GoogleGenerativeAIError) console.log(`GoogleGenerativeAIError ${getErrorText(error)}`);
    if (error instanceof IllegalArgumentError) console.log(`IllegalArgumentError ${getErrorText(error)}`);
  }
}


export default GcpVertexAIGemini;