import { OpenAI } from "openai";
import llmConfig from "../../../config/llm.config";
import { ModelKey, ModelFamily } from "../../../types/llm-models-types";
import { LLMModelSet, LLMPurpose, LLMModelMetadata, LLMErrorMsgRegExPattern } from "../../../types/llm-types";
import BaseOpenAILLM from "./base-openai-llm";

/**
 * Class for the public OpenAI service.
 */
class OpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelSet,
    modelsMetadata: Record<ModelKey, LLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    readonly apiKey: string
  ) { 
    super(modelsKeys, modelsMetadata, errorPatterns);
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): ModelFamily {
    return ModelFamily.OPENAI_MODELS;
  }

  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected getClient() {
    return this.client;
  }

  /**
   * Method to assemble the OpenAI API parameters structure for the given model and prompt.
   */
  protected buildFullLLMParameters(taskType: LLMPurpose, modelKey: ModelKey, prompt: string) {
    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: this.llmModelsMetadata[modelKey].modelId,
        input: prompt
      };
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.llmModelsMetadata[modelKey].modelId,
        temperature: llmConfig.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
        max_completion_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      };        
      return params;
    } 
  }
}

export default OpenAILLM;