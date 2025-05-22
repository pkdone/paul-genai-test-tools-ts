import { ModelFamily, modelFamilyToModelKeyMappings, ModelProviderType, modelFamilyToProviderMap } 
       from "../../types/llm-models-types";
import { LLMProviderImpl } from "../../types/llm-types";
import { EnvVars, isOpenAIEnv, isAzureEnv, isVertexEnv, isBedrockEnv } from "../../types/env-types";
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
const providerRegistry = new Map<ModelProviderType, (env: EnvVars) => LLMProviderImpl>();

/**
 * Register a new LLM provider
 * 
 * @param type Provider type identifier
 * @param factory Function to create the provider instance from environment variables
 */
function registerProvider(type: ModelProviderType, factory: (env: EnvVars) => LLMProviderImpl): void {
  providerRegistry.set(type, factory);
}

/**
 * Create an LLM provider instance based on environment variables
 */
export function getLLMProvider(env: EnvVars): LLMProviderImpl {
  const providerType = getProviderTypeFromModelFamily(env.LLM);
  const factory = providerRegistry.get(providerType);
  if (!factory) throw new Error(`No LLM provider registered for type: ${providerType}`);
  return factory(env);
}

/**
 * Helper function to determine provider type from model family
 */
function getProviderTypeFromModelFamily(modelFamily: ModelFamily): ModelProviderType {
  const providerType = modelFamilyToProviderMap.get(modelFamily);
  if (providerType === undefined) throw new Error(`Unknown model family: ${String(modelFamily)}`);
  return providerType;
}

// Register OpenAI provider
registerProvider(ModelProviderType.OPENAI, (env) => {
  if (!isOpenAIEnv(env)) throw new Error('Invalid model family for OpenAI provider');
  return new OpenAILLM(
    modelFamilyToModelKeyMappings[ModelFamily.OPENAI_MODELS],
    env.OPENAI_LLM_API_KEY
  );
});

// Register Azure OpenAI provider
registerProvider(ModelProviderType.AZURE, (env) => {
  if (!isAzureEnv(env)) throw new Error('Invalid model family for Azure OpenAI provider');
  return new AzureOpenAILLM(
    modelFamilyToModelKeyMappings[ModelFamily.AZURE_OPENAI_MODELS],
    env.AZURE_LLM_API_KEY,
    env.AZURE_API_ENDPOINT,
    env.AZURE_API_EMBEDDINGS_MODEL,
    env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
    env.AZURE_API_COMPLETIONS_MODEL_SECONDARY
  );
});

// Register VertexAI Gemini provider
registerProvider(ModelProviderType.VERTEXAI, (env) => {
  if (!isVertexEnv(env)) throw new Error('Invalid model family for VertexAI Gemini provider');
  return new VertexAIGeminiLLM(
    modelFamilyToModelKeyMappings[ModelFamily.VERTEXAI_GEMINI_MODELS],
    env.GCP_API_PROJECTID,
    env.GCP_API_LOCATION
  );
});

// Register Bedrock providers (multiple variants)
registerProvider(ModelProviderType.BEDROCK, (env) => {
  if (!isBedrockEnv(env)) {
    throw new Error('Invalid model family for Bedrock provider');
  }

  const bedrockModelFamily = env.LLM;
  switch (bedrockModelFamily) {
    case ModelFamily.BEDROCK_TITAN_MODELS:
      return new BedrockTitanLLM(modelFamilyToModelKeyMappings[ModelFamily.BEDROCK_TITAN_MODELS]);
    case ModelFamily.BEDROCK_CLAUDE_MODELS:
      return new BedrockClaudeLLM(modelFamilyToModelKeyMappings[ModelFamily.BEDROCK_CLAUDE_MODELS]);
    case ModelFamily.BEDROCK_LLAMA_MODELS:
      return new BedrockLlamaLLM(modelFamilyToModelKeyMappings[ModelFamily.BEDROCK_LLAMA_MODELS]);
    case ModelFamily.BEDROCK_MISTRAL_MODELS:
      return new BedrockMistralLLM(modelFamilyToModelKeyMappings[ModelFamily.BEDROCK_MISTRAL_MODELS]);
    case ModelFamily.BEDROCK_NOVA_MODELS:
      return new BedrockNovaLLM(modelFamilyToModelKeyMappings[ModelFamily.BEDROCK_NOVA_MODELS]);
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS:
      return new BedrockDeepseekLLM(modelFamilyToModelKeyMappings[ModelFamily.BEDROCK_DEEPSEEK_MODELS]);
    default: {
      const exhaustiveCheck: never = bedrockModelFamily;
      throw new Error(`Unknown Bedrock model family: ${String(exhaustiveCheck)}`);
    }
  }
}); 