import { AzureOpenAI, OpenAI } from "openai";
import { llmConst } from "../../../types/llm-constants";
import { ModelFamily, ModelKey } from "../../../types/llm-models-metadata";
import { LLMModelSet, LLMPurpose } from "../../../types/llm-types";
import BaseOpenAILLM from "./base-openai-llm";
import { BadConfigurationLLMError } from "../../../types/llm-errors";

/**
 * Class for Azure's own managed version of the OpenAI service.
 */
class AzureOpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;
  private readonly modelToDeploymentMappings: Map<string, string>;

  /**
   * Constructor.
   */
  constructor(modelsKeys: LLMModelSet, apiKey: string, endpoint: string, embeddingsDeployment: string, primaryCompletionsDeployment: string, secondaryCompletionsDeployment: string) {
    super(modelsKeys);
    this.modelToDeploymentMappings = new Map();
    this.modelToDeploymentMappings.set(modelsKeys.embeddings, embeddingsDeployment);
    this.modelToDeploymentMappings.set(modelsKeys.primaryCompletion, primaryCompletionsDeployment);
    const secondaryCompletion = modelsKeys.secondaryCompletion;

    if ((secondaryCompletion) && (secondaryCompletion !== ModelKey.UNSPECIFIED)) {
      this.modelToDeploymentMappings.set(secondaryCompletion, secondaryCompletionsDeployment);
    }

    const apiVersion = llmConst.AZURE_API_VERION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): ModelFamily {
    return ModelFamily.AZURE_OPENAI_MODELS;
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
    const deployment = this.modelToDeploymentMappings.get(modelKey);
    if (!deployment) throw new BadConfigurationLLMError(`Model key ${modelKey} not found for ${this.constructor.name}`);      

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
