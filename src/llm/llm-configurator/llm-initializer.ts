import { ModelFamily, modelProviderMappings } from "../../types/llm-models-metadata";
import { LLMConfig, OpenAIConfig, AzureOpenAIConfig, VertexAIGeminiConfig } from "./llm-config-types";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "../llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llms-impl/bedrock/bedrock-deepseek-llm";

/**
 * Load the appropriate class for the required LLM provider using the provided configuration.
 * 
 * @param config Provider-specific configuration object
 * @returns The appropriate LLM provider implementation
 */
export function initializeLLMImplementation(config: LLMConfig) {
  const modelFamily = config.modelFamily as ModelFamily;

  switch (modelFamily) {
    case ModelFamily.OPENAI_MODELS: {
      const openAIConfig = config as OpenAIConfig;
      return new OpenAILLM(modelProviderMappings.OPENAI_MODELS, openAIConfig.apiKey);
    }
    case ModelFamily.AZURE_OPENAI_MODELS: {
      const azureConfig = config as AzureOpenAIConfig;
      return new AzureOpenAILLM(
        modelProviderMappings.AZURE_MODELS, 
        azureConfig.apiKey, 
        azureConfig.endpoint, 
        azureConfig.embeddingsDeployment, 
        azureConfig.primaryCompletionsDeployment, 
        azureConfig.secondaryCompletionsDeployment
      );
    }
    case ModelFamily.VERTEXAI_GEMINI_MODELS: {
      const vertexConfig = config as VertexAIGeminiConfig;
      return new VertexAIGeminiLLM(
        modelProviderMappings.VERTEXAI_MODELS, 
        vertexConfig.project, 
        vertexConfig.location
      );
    }
    case ModelFamily.BEDROCK_TITAN_MODELS: {
      return new BedrockTitanLLM(modelProviderMappings.BEDROCK_TITAN_MODELS);
    }
    case ModelFamily.BEDROCK_CLAUDE_MODELS: {
      return new BedrockClaudeLLM(modelProviderMappings.BEDROCK_CLAUDE_MODELS);
    }
    case ModelFamily.BEDROCK_LLAMA_MODELS: {
      return new BedrockLlamaLLM(modelProviderMappings.BEDROCK_LLAMA_MODELS);
    }
    case ModelFamily.BEDROCK_MISTRAL_MODELS: {
      return new BedrockMistralLLM(modelProviderMappings.BEDROCK_MISTRAL_MODELS);
    }
    case ModelFamily.BEDROCK_NOVA_MODELS: {
      return new BedrockNovaLLM(modelProviderMappings.BEDROCK_NOVA_MODELS);
    }    
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS: {
      return new BedrockDeepseekLLM(modelProviderMappings.BEDROCK_DEEPSEEK_MODELS);
    }
    default: {
      throw new Error(`Unsupported model family: ${String(modelFamily)}`);
    }    
  }
}
