import { AzureOpenAI, OpenAI } from "openai";
import { llmModels, llmConst } from "../../../types/llm-constants";
import { LLMConfiguredModelTypesNames, LLMPurpose, ModelKey } from "../../../types/llm-types";
import BaseOpenAILLM from "./base-openai-llm";


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
    super(ModelKey.GPT_EMBEDDINGS_ADA002, ModelKey.GPT_COMPLETIONS_GPT4_32k, ModelKey.GPT_COMPLETIONS_GPT4_O);
    this.modelToDeploymentMappings = {
      [ModelKey.GPT_EMBEDDINGS_ADA002]: embeddingsDeployment,
      [ModelKey.GPT_COMPLETIONS_GPT4_32k]: regularCompletionsDeployment,
      [ModelKey.GPT_COMPLETIONS_GPT4_O]: premiumCompletionsDeployment,
    } as const;
    const apiVersion = llmConst.AZURE_API_VERION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }


  /**
   * Get the names of the models this plug-in provides.
   */
  public getModelsNames(): LLMConfiguredModelTypesNames {
    return {
      embeddings: llmModels[ModelKey.GPT_EMBEDDINGS_ADA002].modelId,
      regular: llmModels[ModelKey.GPT_COMPLETIONS_GPT4].modelId,
      premium: llmModels[ModelKey.GPT_COMPLETIONS_GPT4_32k].modelId,      
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
  protected buildFullLLMParameters(taskType: string, modelKey: ModelKey, prompt: string): OpenAI.EmbeddingCreateParams | OpenAI.ChatCompletionCreateParams {
    const deployment = this.modelToDeploymentMappings[modelKey];

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
