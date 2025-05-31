import { AzureOpenAI, OpenAI } from "openai";
import llmConfig from "../../../../config/llm.config";
import { LLMModelSet, LLMPurpose, LLMModelMetadata, LLMErrorMsgRegExPattern } from "../../../../types/llm-types";
import BaseOpenAILLM from "../base-openai-llm";
import { BadConfigurationLLMError } from "../../../../types/llm-errors";

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
  constructor(
    modelsKeys: LLMModelSet,
    modelsMetadata: Record<string, LLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    readonly apiKey: string,
    readonly endpoint: string,
    readonly embeddingsDeployment: string,
    readonly primaryCompletionsDeployment: string,
    readonly secondaryCompletionsDeployment: string
  ) { 
    super(modelsKeys, modelsMetadata, errorPatterns);
    this.modelToDeploymentMappings = new Map();
    this.modelToDeploymentMappings.set(modelsKeys.embeddings, embeddingsDeployment);
    this.modelToDeploymentMappings.set(modelsKeys.primaryCompletion, primaryCompletionsDeployment);
    const secondaryCompletion = modelsKeys.secondaryCompletion;

    if ((secondaryCompletion) && (secondaryCompletion !== "UNSPECIFIED")) {
      this.modelToDeploymentMappings.set(secondaryCompletion, secondaryCompletionsDeployment);
    }

    const apiVersion = llmConfig.AZURE_API_VERION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return "AzureOpenAI";
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
  protected buildFullLLMParameters(taskType: LLMPurpose, modelKey: string, prompt: string) {
    const deployment = this.modelToDeploymentMappings.get(modelKey);
    if (!deployment) throw new BadConfigurationLLMError(`Model key ${modelKey} not found for ${this.constructor.name}`);      

    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: deployment,
        input: prompt
      };
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: deployment,
        temperature: llmConfig.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
      };        
      return params;
    } 
  }
}

export default AzureOpenAILLM;
