import { OpenAIClient, AzureKeyCredential, Embeddings, ChatCompletions } from "@azure/openai";
import envConst from "../../types/env-constants";
import { getEnvVar } from "../../utils/envvar-utils";
import { llmConst } from "../../types/llm-constants";
import { GPT_EMBEDDINGS_MODEL_ADA002, GPT_COMPLETIONS_MODEL_GPT4, GPT_COMPLETIONS_MODEL_GPT4_32k }
       from "../../types/llm-models";
import { LLMConfiguredModelTypes } from "../../types/llm-types";
import { GPTLLMError } from "../../types/gpt-types";
import AbstractGPT from "./abstract-gpt";


/**
 * Class for Azure's own managed version of the OpenAI service.
 */
class AzureOpenAIGPT extends AbstractGPT {
  // Private fields
  private readonly client: OpenAIClient;
  private readonly modelToDeploymentMappings: { [key: string]: string };


  /**
   * Constructor.
   */
  constructor() {
    super(GPT_EMBEDDINGS_MODEL_ADA002, GPT_COMPLETIONS_MODEL_GPT4, GPT_COMPLETIONS_MODEL_GPT4_32k);
    this.modelToDeploymentMappings = {
      [GPT_EMBEDDINGS_MODEL_ADA002]: getEnvVar<string>(envConst.ENV_AZURE_API_EMBEDDINGS_MODEL),
      [GPT_COMPLETIONS_MODEL_GPT4]: getEnvVar<string>(envConst.ENV_AZURE_API_COMPLETIONS_MODEL_REGULAR),
      [GPT_COMPLETIONS_MODEL_GPT4_32k]: getEnvVar<string>(envConst.ENV_AZURE_API_COMPLETIONS_MODEL_PREMIUM),
    } as const;
    const apiKey: string = getEnvVar<string>(envConst.ENV_AZURE_LLM_API_KEY);
    const endpoint: string = getEnvVar<string>(envConst.ENV_AZURE_API_ENDPOINT);
    this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMConfiguredModelTypes {
    return {
      embeddings: GPT_EMBEDDINGS_MODEL_ADA002,
      regular: GPT_COMPLETIONS_MODEL_GPT4,
      premium: GPT_COMPLETIONS_MODEL_GPT4_32k,
    };
  }


  /**
   * Invoke the actual LLM's embedding API directly.
   */
  protected async runGPTGetEmbeddings(model: string, content: string): Promise<Embeddings> {
    return await this.client.getEmbeddings(this.modelToDeploymentMappings[model], [content]);
  }


  /**
   * Invoke the actual LLM's completion API directly.
   */
  protected async runGPTGetCompletion(model: string, prompt: string): Promise<ChatCompletions> {
    const messages = [{ role: "user", content: prompt }];
    const params = {
      temperature: llmConst.ZERO_TEMP,
      // maxTokens: llmModels[model].maxTotalTokens, // Doesn't seem to work properly with Azure API - causes weird long completion
    };
    return await this.client.getChatCompletions(this.modelToDeploymentMappings[model], messages, params);
  }


  /**
   * See if an error object indicates a network issue or throttling event.
   */
  protected isLLMOverloaded(error: unknown): boolean {
    const llmError  = error as GPTLLMError;
    return llmError.code === 429 ||
           llmError.code === "429" || 
           llmError.status === 429 ||
           llmError.status === "429" ||            
           llmError.error?.code === "429" ||
           llmError.response?.status === 429;
  }

  
  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown): boolean {
    const llmError = error as GPTLLMError;
    return llmError.code === "context_length_exceeded" ||
           llmError.type === "invalid_request_error";
  }
}


export default AzureOpenAIGPT;
