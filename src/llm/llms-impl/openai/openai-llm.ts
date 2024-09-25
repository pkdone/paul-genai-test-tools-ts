import { OpenAI } from "openai";
import { llmConst } from "../../../types/llm-constants";
import { GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3, GPT_COMPLETIONS_MODEL_GPT4_TURBO,
         GPT_COMPLETIONS_MODEL_GPT4_O, 
         llmModels} from "../../../types/llm-models";
import { LLMConfiguredModelTypesNames, LLMPurpose } from "../../../types/llm-types";
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
    super(GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3, GPT_COMPLETIONS_MODEL_GPT4_O, GPT_COMPLETIONS_MODEL_GPT4_O);
    this.client = new OpenAI({ apiKey })       
  }


  /**
   * Get the names of the models this plug-in provides.
   */ 
  public getModelsNames(): LLMConfiguredModelTypesNames {
    return {
      embeddings: GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3,
      regular: GPT_COMPLETIONS_MODEL_GPT4_TURBO,
      premium: GPT_COMPLETIONS_MODEL_GPT4_O,
    };
  }

  
  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected getClient(): OpenAI {
    return this.client;
  }


  /**
   * Method to assemble the OpenAI API parameters structure for the given model and prompt.
   */
  protected buildFullLLMParameters(taskType: string, model: string, prompt: string): OpenAI.EmbeddingCreateParams | OpenAI.ChatCompletionCreateParams {
    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model,
        input: prompt
      }
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        temperature: llmConst.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
        max_completion_tokens: llmModels[model].maxCompletionTokens,
      };        
      return params;
    } 
  }
}


export default OpenAILLM;