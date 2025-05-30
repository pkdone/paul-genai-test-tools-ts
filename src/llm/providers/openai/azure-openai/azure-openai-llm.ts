import { AzureOpenAI, OpenAI } from "openai";
import llmConfig from "../../../../config/llm.config";
import { LLMModelInternalKeysSet, LLMPurpose, LLMModelMetadata, LLMErrorMsgRegExPattern } from "../../../../types/llm.types";
import BaseOpenAILLM from "../base-openai-llm";
import { BadConfigurationLLMError } from "../../../../types/llm-errors.types";
import { AZURE_OPENAI } from "./azure-openai.manifest";

// Constants
const AZURE_API_VERSION = "2025-01-01-preview";

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
    modelsKeys: LLMModelInternalKeysSet,
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
    this.modelToDeploymentMappings.set(modelsKeys.embeddingsInternalKey, embeddingsDeployment);
    this.modelToDeploymentMappings.set(modelsKeys.primaryCompletionInternalKey, primaryCompletionsDeployment);
    const secondaryCompletion = modelsKeys.secondaryCompletionInternalKey;

    if ((secondaryCompletion) && (secondaryCompletion !== "UNSPECIFIED")) {
      this.modelToDeploymentMappings.set(secondaryCompletion, secondaryCompletionsDeployment);
    }

    const apiVersion = AZURE_API_VERSION;
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return AZURE_OPENAI;
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
  protected buildFullLLMParameters(taskType: LLMPurpose, modelInternalKey: string, prompt: string) {
    const deployment = this.modelToDeploymentMappings.get(modelInternalKey);
    if (!deployment) throw new BadConfigurationLLMError(`Model key ${modelInternalKey} not found for ${this.constructor.name}`);      

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