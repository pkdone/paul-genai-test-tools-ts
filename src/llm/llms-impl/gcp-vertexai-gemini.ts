import { VertexAI, ModelParams, RequestOptions, FinishReason, HarmCategory, HarmBlockThreshold, 
         GoogleApiError, ClientError, GoogleAuthError, GoogleGenerativeAIError, 
         IllegalArgumentError } from "@google-cloud/vertexai";
import { getEnvVar } from "../../utils/envvar-utils";
import envConst from "../../types/env-constants";
import { llmConst } from "../../types/llm-constants";
import { LLMInvocationPurpose, LLMResponseStatus, LLMModelSizeNames, LLMContext,
         LLMFunctionResponse } from "../../types/llm-types";
import AbstractLLM from "./abstract-llm";


/**
 * Class for the GCP Vertex AI Gemini service.
 */
export class GcpVertexAIGemini extends AbstractLLM {
  // Private fields
  private client: VertexAI;


  /**
   * Constructor
   */
  constructor() {
    super(llmConst.GCP_API_EMBEDDINGS_MODEL_GECKO, llmConst.GCP_API_COMPLETIONS_MODEL_SMALL_GEMINI, llmConst.GCP_API_COMPLETIONS_MODEL_LARGE_GEMINI);
    const project = getEnvVar<string>(envConst.ENV_GCP_API_PROJECTID);
    const location = getEnvVar<string>(envConst.ENV_GCP_API_LOCATION);
    this.client = new VertexAI({project, location});
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMModelSizeNames {
    return {
      embeddings: llmConst.GCP_API_EMBEDDINGS_MODEL_GECKO,
      small: llmConst.GCP_API_COMPLETIONS_MODEL_SMALL_GEMINI,
      large: llmConst.GCP_API_COMPLETIONS_MODEL_LARGE_GEMINI,
    };
  }  


  /**
   * Execute the prompt against the LLM and return the LLM's answer.
   */
  protected async runLLMTask(model: string, taskType: LLMInvocationPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse> {
    let result: LLMFunctionResponse = { status: LLMResponseStatus.UNKNOWN, request: prompt, context };
    
    try {
      const { modelParams, requestOptions } = this.buildFullLLMParameters(taskType, model)
      const llm = this.client.getGenerativeModel(modelParams, requestOptions);
      const llmResponses = await llm.generateContent(prompt);
      const usageMetadata = llmResponses?.response?.usageMetadata;
      const llmResponse = llmResponses?.response?.candidates?.[0];
      const finishReason = llmResponse?.finishReason ?? FinishReason.OTHER;      
      const responseContent = llmResponse?.content?.parts?.[0]?.text ?? "";

      if (finishReason === FinishReason.STOP) {
        if (!responseContent) throw new Error("LLM response was empty");
        result = this.postProcessAsJSONIfNeededGettingNewResult(result, model, taskType, responseContent, doReturnJSON);          
      } else if ([FinishReason.BLOCKLIST, FinishReason.PROHIBITED_CONTENT, FinishReason.RECITATION, FinishReason.SAFETY, FinishReason.SPII].includes(finishReason)) {
        throw new Error(`LLM response was not safely completed - reason given: ${finishReason}`);
      } else {
        const promptTokens = usageMetadata?.promptTokenCount;
        const completionTokens = usageMetadata?.candidatesTokenCount;
        const totalTokens = usageMetadata?.totalTokenCount;
        const tokensUage = this.extractTokensAmountFromMetadataOrGuessFromContent(model, prompt, responseContent, promptTokens, completionTokens, totalTokens)
        Object.assign(result, { status: LLMResponseStatus.EXCEEDED, tokensUage});  
      }
    } catch (error: unknown) {
      if (this.isLLMOverloaded(error)) {
        Object.assign(result, { status: LLMResponseStatus.OVERLOADED });  
      } else {
        throw error;
      }
    }

    return result;
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
  private isLLMOverloaded(error: unknown): boolean {  
    if ((error instanceof GoogleApiError) && (error.code === 429)) {
      return true;
    }

    if (error instanceof Error) {
      const errMsg = error.message.toLowerCase();

      if ((errMsg.includes("reason given: recitation")) ||
          (errMsg.includes("exception posting request to model"))) {
        return true;
      }
    }

    if (error instanceof GoogleApiError) {
      console.log("GoogleApiError");
      return false;
    }

    if (error instanceof ClientError) {
      console.log("ClientError");
      return false;
    }
    
    if (error instanceof GoogleAuthError) {
      console.log("GoogleAuthError");
      return false;
    }

    if (error instanceof GoogleGenerativeAIError) {
      console.log("GoogleGenerativeAIError");
      return false;
    }

    if (error instanceof IllegalArgumentError) {
      console.log("IllegalArgumentError");
      return false;
    }

    return false;
  }  
}
