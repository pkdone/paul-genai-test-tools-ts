import { ModelFamily, modelProviderMappings } from "../../types/llm-models-metadata";
import { LLMConfig, LLMProviderType, BedrockVariantType } from "../../types/llm-config-types";
import { LLMProviderImpl } from "../../types/llm-types";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "../llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llms-impl/bedrock/bedrock-deepseek-llm";

// Map of registered providers
const providerRegistry = new Map<LLMProviderType, (config: LLMConfig) => LLMProviderImpl>();

/**
 * Register a new LLM provider
 * 
 * @param type Provider type identifier
 * @param factory Function to create the provider instance
 */
export function registerProvider(type: LLMProviderType, factory: (config: LLMConfig) => LLMProviderImpl): void {
  providerRegistry.set(type, factory);
}

/**
 * Create an LLM provider instance based on the configuration
 * 
 * @param config LLM provider configuration
 * @returns LLM provider implementation instance
 */
export function createProvider(config: LLMConfig): LLMProviderImpl {
  const factory = providerRegistry.get(config.llmProviderType);
  if (!factory) {
    throw new Error(`No LLM provider registered for type: ${config.llmProviderType}`);
  }
  return factory(config);
}

// Register all LLM providers
// Register OpenAI provider
registerProvider(LLMProviderType.OPENAI, (config) => {
  if (config.llmProviderType !== LLMProviderType.OPENAI) throw new Error('Invalid config type for OpenAI provider');
  return new OpenAILLM(
    modelProviderMappings[ModelFamily.OPENAI_MODELS],
    config.apiKey
  );
});

// Register Azure OpenAI provider
registerProvider(LLMProviderType.AZURE, (config) => {
  if (config.llmProviderType !== LLMProviderType.AZURE) throw new Error('Invalid config type for Azure OpenAI provider');
  return new AzureOpenAILLM(
    modelProviderMappings[ModelFamily.AZURE_OPENAI_MODELS],
    config.apiKey,
    config.apiEndpoint,
    config.embeddingsModel,
    config.completionsModelPrimary,
    config.completionsModelSecondary
  );
});

// Register VertexAI Gemini provider
registerProvider(LLMProviderType.VERTEX, (config) => {
  if (config.llmProviderType !== LLMProviderType.VERTEX) throw new Error('Invalid config type for VertexAI Gemini provider');
  return new VertexAIGeminiLLM(
    modelProviderMappings[ModelFamily.VERTEXAI_GEMINI_MODELS],
    config.projectId,
    config.location
  );
});

// Register Bedrock providers (multiple variants)
registerProvider(LLMProviderType.BEDROCK, (config) => {
  if (config.llmProviderType !== LLMProviderType.BEDROCK) throw new Error('Invalid config type for Bedrock provider');
  
  switch (config.variant) {
    case BedrockVariantType.TITAN:
      return new BedrockTitanLLM(modelProviderMappings[ModelFamily.BEDROCK_TITAN_MODELS]);
    case BedrockVariantType.CLAUDE:
      return new BedrockClaudeLLM(modelProviderMappings[ModelFamily.BEDROCK_CLAUDE_MODELS]);
    case BedrockVariantType.LLAMA:
      return new BedrockLlamaLLM(modelProviderMappings[ModelFamily.BEDROCK_LLAMA_MODELS]);
    case BedrockVariantType.MISTRAL:
      return new BedrockMistralLLM(modelProviderMappings[ModelFamily.BEDROCK_MISTRAL_MODELS]);
    case BedrockVariantType.NOVA:
      return new BedrockNovaLLM(modelProviderMappings[ModelFamily.BEDROCK_NOVA_MODELS]);
    case BedrockVariantType.DEEPSEEK:
      return new BedrockDeepseekLLM(modelProviderMappings[ModelFamily.BEDROCK_DEEPSEEK_MODELS]);
    default: {
      // Use a block to allow declaration
      const exhaustiveCheck: never = config.variant;
      throw new Error(`Unknown Bedrock variant: ${String(exhaustiveCheck)}`);
    }
  }
}); 