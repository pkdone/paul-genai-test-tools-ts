import { AzureOpenAI, OpenAI } from "openai";
import { llmConst, modelMappings } from "../../../types/llm-constants";
import { LLMPurpose, ModelKey } from "../../../types/llm-types";
import BaseOpenAILLM from "./base-openai-llm";

/**
 * Class for Azure's own managed version of the OpenAI service.
 */
class AzureOpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;
  private readonly modelToDeploymentMappings: Record<string, string>;

  /**
   * Constructor.
   */
  constructor(apiKey: string, endpoint: string, embeddingsDeployment: string, primaryCompletionsDeployment: string, secondaryCompletionsDeployment: string) {
    super(modelMappings.AZURE_EMBEDDINGS_MODEL_KEY, modelMappings.AZURE_COMPLETIONS_MODELS_KEYS);
    this.modelToDeploymentMappings = {
      [modelMappings.AZURE_EMBEDDINGS_MODEL_KEY]: embeddingsDeployment,
      [modelMappings.AZURE_COMPLETIONS_MODELS_KEYS[0]]: primaryCompletionsDeployment,
    };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if ((modelMappings.AZURE_COMPLETIONS_MODELS_KEYS.length > 1) && secondaryCompletionsDeployment) this.modelToDeploymentMappings[modelMappings.AZURE_COMPLETIONS_MODELS_KEYS[1]] = secondaryCompletionsDeployment;
    const apiVersion = llmConst.AZURE_API_VERION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
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
