import { VertexAI, ModelParams, RequestOptions, FinishReason, HarmCategory, HarmBlockThreshold, 
         GoogleApiError, ClientError, GoogleAuthError, GoogleGenerativeAIError, 
         IllegalArgumentError } from "@google-cloud/vertexai";
import * as aiplatform from "@google-cloud/aiplatform";
const { helpers } = aiplatform;
import { llmModels, llmConst } from "../../../types/llm-constants";
import { LLMConfiguredModelTypesNames, LLMPurpose, ModelKey } from "../../../types/llm-types";
import { LLMImplSpecificResponseSummary } from "../llm-impl-types";
import { getErrorText } from "../../../utils/error-utils";
import AbstractLLM from "../abstract-llm";
import { BadConfigurationLLMError, BadResponseContentLLMError, RejectionResponseLLMError }
       from "../../../types/llm-errors";
const VERTEXAI_TERMINAL_FINISH_REASONS = [ FinishReason.BLOCKLIST, FinishReason.PROHIBITED_CONTENT,
                                           FinishReason.RECITATION, FinishReason.SAFETY,
                                           FinishReason.SPII];


/**
 * Class for the GCP Vertex AI Gemini service.
 */
class VertexAIGeminiLLM extends AbstractLLM {
  // Private fields
  private readonly vertexAiApiClient: VertexAI;
  private readonly embeddingsApiClient: aiplatform.PredictionServiceClient;
  private readonly apiEndpointPrefix: string;


  /**
   * Constructor
   */
  constructor(project: string, location: string) {
    super(ModelKey.GCP_EMBEDDINGS_TEXT_005, ModelKey.GCP_COMPLETIONS_GEMINI_FLASH20, 
          ModelKey.GCP_COMPLETIONS_GEMINI_PRO15);
    this.vertexAiApiClient = new VertexAI({project, location});
    this.embeddingsApiClient = new aiplatform.PredictionServiceClient({ apiEndpoint: `${location}-aiplatform.googleapis.com` });
    this.apiEndpointPrefix = `projects/${project}/locations/${location}/publishers/google/models/`;
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMConfiguredModelTypesNames {
    return {
      embeddings: llmModels[ModelKey.GCP_EMBEDDINGS_TEXT_005].modelId,
      regular: llmModels[ModelKey.GCP_COMPLETIONS_GEMINI_FLASH15].modelId,
      premium: llmModels[ModelKey.GCP_COMPLETIONS_GEMINI_PRO15].modelId,      
    };
  }  


  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeImplementationSpecificLLM(taskType: LLMPurpose, modelKey: ModelKey, prompt: string): Promise<LLMImplSpecificResponseSummary> {
    if (taskType === LLMPurpose.EMBEDDINGS) {
      return await this.invokeImplementationSpecificEmbeddingsLLM(modelKey, prompt);
    } else {
      return this.invokeImplementationSpecificCompletionLLM(modelKey, prompt);
    }
  }


  /**
   * Invoke the actuall LLM's embedding API directly.
   */ 
  protected async invokeImplementationSpecificEmbeddingsLLM(modelKey: ModelKey, prompt: string): Promise<LLMImplSpecificResponseSummary> {  
    // Invoke LLM
    const fullParameters = this.buildFullEmebddingsLLMParameters(modelKey, prompt);
    const llmResponses = await this.embeddingsApiClient.predict(fullParameters);
    const [predictionResponses] = llmResponses;
    const predictions = predictionResponses.predictions;

    // Capture response content
    const embeddingsArray = this.extractEmbeddingsFromPredictions(predictions);
    const responseContent = embeddingsArray[0];

    // Capture finish reason
    const isIncompleteResponse = (!responseContent);

    // Capture token usage 
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 };  // API doesn't provide token counts
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  /**
   * Invoke the actuall LLM's completion API directly.
   */ 
  protected async invokeImplementationSpecificCompletionLLM(modelKey: ModelKey, prompt: string): Promise<LLMImplSpecificResponseSummary> {
    // Invoke LLM
    const { modelParams, requestOptions } = this.buildFullCompletionLLMParameters(modelKey);
    const llm = this.vertexAiApiClient.getGenerativeModel(modelParams, requestOptions);
    const llmResponses = await llm.generateContent(prompt);
    const usageMetadata = llmResponses?.response?.usageMetadata;
    const llmResponse = llmResponses?.response?.candidates?.[0];
    if (!llmResponse) throw new BadResponseContentLLMError("LLM response was completely empty");

    // Capture response content
    const responseContent = llmResponse?.content?.parts?.[0]?.text ?? "";

    // Capture finish reason
    const finishReason = llmResponse?.finishReason ?? FinishReason.OTHER;
    if (VERTEXAI_TERMINAL_FINISH_REASONS.includes(finishReason)) throw new RejectionResponseLLMError(`LLM response was not safely completed - reason given: ${finishReason}`, finishReason);
    const isIncompleteResponse = ((finishReason !== FinishReason.STOP)) || (!responseContent);

    // Capture token usage
    const promptTokens = usageMetadata?.promptTokenCount ?? -1;
    const completionTokens = usageMetadata?.candidatesTokenCount ?? -1;
    const maxTotalTokens = -1; // Not "totalTokenCount" as that is total of prompt + cpompletion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  /**
   * Assemble the GCP API parameters structure for the given model and prompt.
   */
  private buildFullEmebddingsLLMParameters(modelKey: ModelKey, prompt: string): aiplatform.protos.google.cloud.aiplatform.v1.IPredictRequest {
    const model = llmModels[modelKey].modelId;
    const endpoint = `${this.apiEndpointPrefix}${model}`;
    const instance = helpers.toValue({ content: prompt, task_type: llmConst.GCP_API_EMBEDDINGS_TASK_TYPE });
    if (!instance) throw new BadConfigurationLLMError("Failed to convert prompt to IValue");
    const parameters = helpers.toValue({});
    return { endpoint, instances: [instance], parameters };
  }


  /**
   * Assemble the GCP API parameters structure for the given model and prompt.
   */
  private buildFullCompletionLLMParameters(modelKey: ModelKey): { modelParams: ModelParams, requestOptions: RequestOptions } {
    const modelParams = { 
      model: llmModels[modelKey].modelId,
      generationConfig: { 
        candidateCount: 1,
        topP: llmConst.TOP_P_LOWEST,
        topK: llmConst.TOP_K_LOWEST,
        temperature: llmConst.ZERO_TEMP,   
        maxOutputTokens: llmModels[modelKey].maxCompletionTokens,
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
  protected isTokenLimitExceeded(_error: unknown): boolean {    
    return false;
  }  
  

  /**
   * Extract the embeddings from the predictions.
   */
  private extractEmbeddingsFromPredictions(predictions: aiplatform.protos.google.protobuf.IValue[] | null | undefined) {
    if (!predictions) throw new BadConfigurationLLMError("Predictions are null or undefined");
    const embeddings = predictions.map(p => {
      if (!p.structValue?.fields) throw new BadConfigurationLLMError("structValue or fields is null or undefined");
      const embeddingsProto = p.structValue.fields.embeddings;
      if (!embeddingsProto.structValue?.fields) throw new BadConfigurationLLMError("embeddingsProto.structValue or embeddingsProto.structValue.fields is null or undefined");
      const valuesProto = embeddingsProto.structValue.fields.values;
      if (!valuesProto.listValue?.values) throw new BadConfigurationLLMError("valuesProto.listValue or valuesProto.listValue.values is null or undefined");
      return valuesProto.listValue.values.map(v => v.numberValue);
    });
    return embeddings;
  }


  /** 
   * Debug currently non-checked error types.
   */
  protected debugCurrentlyNonCheckedErrorTypes(error: unknown): void {
    if (error instanceof GoogleApiError) console.log(`GoogleApiError ${getErrorText(error)}`);
    if (error instanceof ClientError) console.log(`ClientError ${getErrorText(error)}`);
    if (error instanceof GoogleAuthError) console.log(`GoogleAuthError ${getErrorText(error)}`);
    if (error instanceof GoogleGenerativeAIError) console.log(`GoogleGenerativeAIError ${getErrorText(error)}`);
    if (error instanceof IllegalArgumentError) console.log(`IllegalArgumentError ${getErrorText(error)}`);
  }
}


export default VertexAIGeminiLLM;