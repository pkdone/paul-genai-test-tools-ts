import { OpenAI } from "openai";
import { llmConst } from "../../../types/llm-constants";
import { ModelKey, ModelFamily } from "../../../types/llm-models-metadata";
import { LLMModelSet, LLMPurpose } from "../../../types/llm-types";
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
  constructor(modelsKeys: LLMModelSet, readonly apiKey: string) { 
    super(modelsKeys);
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
  protected buildFullLLMParameters(taskType: string, modelKey: ModelKey, prompt: string) {
    if (taskType === LLMPurpose.EMBEDDINGS.toString()) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: this.llmModelsMetadata[modelKey].modelId,
        input: prompt
      };
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.llmModelsMetadata[modelKey].modelId,
        temperature: llmConst.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
        max_completion_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      };        
      return params;
    } 
  }
}

export default OpenAILLM;