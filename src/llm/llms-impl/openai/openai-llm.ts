import { OpenAI } from "openai";
import { llmModels, llmConst, modelMappings } from "../../../types/llm-constants";
import { LLMPurpose,ModelKey } from "../../../types/llm-types";
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
  constructor(apiKey: string) { 
    super(modelMappings.OPENAI_EMBEDDINGS_MODEL_KEY, modelMappings.OPENAI_COMPLETIONS_MODELS_KEYS);
    this.client = new OpenAI({ apiKey });
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
        model: llmModels[modelKey].modelId,
        input: prompt
      };
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: llmModels[modelKey].modelId,
        temperature: llmConst.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
        max_completion_tokens: llmModels[modelKey].maxCompletionTokens,
      };        
      return params;
    } 
  }
}

export default OpenAILLM;