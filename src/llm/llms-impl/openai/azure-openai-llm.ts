import { AzureOpenAI, OpenAI } from "openai";
import { llmConst } from "../../../types/llm-constants";
import { GPT_EMBEDDINGS_MODEL_ADA002, GPT_COMPLETIONS_MODEL_GPT4, GPT_COMPLETIONS_MODEL_GPT4_32k }
       from "../../../types/llm-models";
import { LLMConfiguredModelTypesNames, LLMPurpose } from "../../../types/llm-types";
import BaseOpenAILLM from "./base-openai-llm";
const AZURE_API_VERION = "2024-04-01-preview";


/**
 * Class for Azure's own managed version of the OpenAI service.
 */
class AzureOpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;
  private readonly modelToDeploymentMappings: Readonly<{ [key: string]: string }>;


  /**
   * Constructor.
   */
  constructor(apiKey: string, endpoint: string, embeddingsDeployment: string, regularCompletionsDeployment: string, premiumCompletionsDeployment: string) {
    super(GPT_EMBEDDINGS_MODEL_ADA002, GPT_COMPLETIONS_MODEL_GPT4, GPT_COMPLETIONS_MODEL_GPT4_32k);
    this.modelToDeploymentMappings = {
      [GPT_EMBEDDINGS_MODEL_ADA002]: embeddingsDeployment,
      [GPT_COMPLETIONS_MODEL_GPT4]: regularCompletionsDeployment,
      [GPT_COMPLETIONS_MODEL_GPT4_32k]: premiumCompletionsDeployment,
    } as const;
    const apiVersion = AZURE_API_VERION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMConfiguredModelTypesNames {
    return {
      embeddings: GPT_EMBEDDINGS_MODEL_ADA002,
      regular: GPT_COMPLETIONS_MODEL_GPT4,
      premium: GPT_COMPLETIONS_MODEL_GPT4_32k,
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
    const deployment = this.modelToDeploymentMappings[model];

    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: deployment,
        input: prompt
      }
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: deployment,
        temperature: llmConst.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
      };        
      return params;
    } 
  }
}


export default AzureOpenAILLM;
