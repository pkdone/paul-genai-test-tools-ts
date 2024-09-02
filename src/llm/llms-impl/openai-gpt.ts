import { OpenAI } from "openai";
import envConst from "../../types/env-constants";
import { getEnvVar } from "../../utils/envvar-utils";
import { llmConst } from "../../types/llm-constants";
import { LLMModelSizeNames } from "../../types/llm-types";
import AbstractGPT from "./abstract-gpt";


/**
 * Class for the public OpenAI service.
 */
class OpenAIGPT extends AbstractGPT {
  // Private fields
  private client;


  /**
   * Constructor.
   */
  constructor() { 
    const apiKey = getEnvVar<string>(envConst.ENV_OPENAI_LLM_API_KEY);
    if (!apiKey) throw new Error("The following environment variable must be specified if using OpenAI: 'OPENAI_LLM_API_KEY'");
    super(llmConst.GPT_API_EMBEDDINGS_MODEL, llmConst.GPT_API_COMPLETIONS_MODEL_SMALL, llmConst.GPT_API_COMPLETIONS_MODEL_XLARGE);
    this.client = new OpenAI({ apiKey })       
  }


  /**
   * Get the names of the models this plug-in provides.
   */ 
  public getModelsNames(): LLMModelSizeNames {
    return {
      embeddings: llmConst.GPT_API_EMBEDDINGS_MODEL,
      small: llmConst.GPT_API_COMPLETIONS_MODEL_SMALL,
      large: llmConst.GPT_API_COMPLETIONS_MODEL_XLARGE,
    };
  }


  /**
   * Invoke the actuall LLM's embedding API directly.
   */ 
  protected async runGPTGetEmbeddings(model: string, content: string): Promise<OpenAI.CreateEmbeddingResponse> {
    const params = { model, input: content };
    return await this.client.embeddings.create(params);    
  }


  /**
   * Invoke the actuall LLM's completion API directly.
   */ 
  protected async runGPTGetCompletion(model: string, prompt: string): Promise<OpenAI.ChatCompletion> {
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model,
      temperature: llmConst.ZERO_TEMP,
      messages: [{ role: "user", content: prompt } ],
    };
    return await this.client.chat.completions.create(params);
  }
}


export default OpenAIGPT;