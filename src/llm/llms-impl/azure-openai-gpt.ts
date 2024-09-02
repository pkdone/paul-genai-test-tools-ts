import { OpenAIClient, AzureKeyCredential, Embeddings, ChatCompletions } from "@azure/openai";
import envConst from "../../types/env-constants";
import { getEnvVar } from "../../utils/envvar-utils";
import { llmConst } from "../../types/llm-constants";
import { LLMModelSizeNames } from "../../types/llm-types";
import AbstractGPT from "./abstract-gpt";


/**
 * Class for Azure's own managed version of the OpenAI service.
 */
class AzureOpenAIGPT extends AbstractGPT {
  // Private fields
  private client: OpenAIClient;


  /**
   * Constructor.
   */
  constructor() {
    const apiKey: string = getEnvVar<string>(envConst.ENV_AZURE_LLM_API_KEY);
    const endpoint: string = getEnvVar<string>(envConst.ENV_AZURE_API_ENDPOINT);
    const embeddingsModel: string = getEnvVar<string>(envConst.ENV_AZURE_API_EMBEDDINGS_MODEL);
    const completionsModelSmall: string = getEnvVar<string>(envConst.ENV_AZURE_API_COMPLETIONS_MODEL_SMALL);
    const completionsModelLarge: string = getEnvVar<string>(envConst.ENV_AZURE_API_COMPLETIONS_MODEL_LARGE);
    super(embeddingsModel, completionsModelSmall, completionsModelLarge);
    this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMModelSizeNames {
    return {
      embeddings: llmConst.GPT_API_EMBEDDINGS_MODEL,
      small: llmConst.GPT_API_COMPLETIONS_MODEL_SMALL,
      large: llmConst.GPT_API_COMPLETIONS_MODEL_LARGE,
    };
  }


  /**
   * Invoke the actual LLM's embedding API directly.
   */
  protected async runGPTGetEmbeddings(model: string, content: string): Promise<Embeddings> {
    return await this.client.getEmbeddings(model, [content]);
  }


  /**
   * Invoke the actual LLM's completion API directly.
   */
  protected async runGPTGetCompletion(model: string, prompt: string): Promise<ChatCompletions> {
    const messages = [{ role: 'user', content: prompt }];
    const params = { temperature: llmConst.ZERO_TEMP };
    return await this.client.getChatCompletions(model, messages, params);
  }
}


export default AzureOpenAIGPT;
