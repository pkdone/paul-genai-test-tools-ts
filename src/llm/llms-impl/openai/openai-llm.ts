import { OpenAI } from "openai";
import { llmModels, llmConst } from "../../../types/llm-constants";
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
    super(ModelKey.GPT_EMBEDDINGS_TEXT_3SMALL, ModelKey.GPT_COMPLETIONS_GPT4_TURBO, ModelKey.GPT_COMPLETIONS_GPT4_O);
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Get the names of the models this plug-in provides.
   */ 
  getModelsNames() {
    return {
      embeddings: llmModels[ModelKey.GPT_EMBEDDINGS_TEXT_3SMALL].modelId,
      regular: llmModels[ModelKey.GPT_COMPLETIONS_GPT4_TURBO].modelId,
      premium: llmModels[ModelKey.GPT_COMPLETIONS_GPT4_O].modelId,      
    };
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