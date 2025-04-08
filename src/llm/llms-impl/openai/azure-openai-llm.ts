import { AzureOpenAI, OpenAI } from "openai";
import { llmModels, llmConst } from "../../../types/llm-constants";
import { LLMPurpose, ModelKey } from "../../../types/llm-types";
import BaseOpenAILLM from "./base-openai-llm";

/**
 * Class for Azure's own managed version of the OpenAI service.
 */
class AzureOpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;
  private readonly modelToDeploymentMappings: Readonly<Record<string, string>>;

  /**
   * Constructor.
   */
  constructor(apiKey: string, endpoint: string, embeddingsDeployment: string, primaryCompletionsDeployment: string, secondaryCompletionsDeployment: string) {
    super(ModelKey.GPT_EMBEDDINGS_ADA002, ModelKey.GPT_COMPLETIONS_GPT4_O, ModelKey.GPT_COMPLETIONS_GPT4_32k);
    this.modelToDeploymentMappings = {
      [ModelKey.GPT_EMBEDDINGS_ADA002]: embeddingsDeployment,
      [ModelKey.GPT_COMPLETIONS_GPT4_O]: primaryCompletionsDeployment,
      [ModelKey.GPT_COMPLETIONS_GPT4_32k]: secondaryCompletionsDeployment,
    } as const;
    const apiVersion = llmConst.AZURE_API_VERION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Get the names of the models this plug-in provides.
   */
  getModelsNames() {
    return {
      embeddings: llmModels[ModelKey.GPT_EMBEDDINGS_ADA002].modelId,
      primary: llmModels[ModelKey.GPT_COMPLETIONS_GPT4_O].modelId,
      secondary: llmModels[ModelKey.GPT_COMPLETIONS_GPT4_32k].modelId,      
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
    const deployment = this.modelToDeploymentMappings[modelKey];

    if (taskType === LLMPurpose.EMBEDDINGS.toString()) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: deployment,
        input: prompt
      };
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
