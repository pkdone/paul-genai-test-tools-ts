import { ModelFamily, modelProviderMappings } from "../../types/llm-models-metadata";
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


/// Enum for LLM provider types
enum LLMProviderType {
  OPENAI = 'openai',
  AZURE = 'azure',
  VERTEX = 'vertex',
  BEDROCK = 'bedrock'
}

// Map of registered providers
const providerRegistry = new Map<LLMProviderType, (env: EnvVars) => LLMProviderImpl>();

/**
 * Register a new LLM provider
 * 
 * @param type Provider type identifier
 * @param factory Function to create the provider instance from environment variables
 */
function registerProvider(type: LLMProviderType, factory: (env: EnvVars) => LLMProviderImpl): void {
  providerRegistry.set(type, factory);
}

/**
 * Create an LLM provider instance based on environment variables
 * 
 * @param env Environment variables
 * @returns LLM provider implementation instance
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
function getProviderTypeFromModelFamily(modelFamily: ModelFamily): LLMProviderType {
  switch (modelFamily) {
    case ModelFamily.OPENAI_MODELS:
      return LLMProviderType.OPENAI;
    case ModelFamily.AZURE_OPENAI_MODELS:
      return LLMProviderType.AZURE;
    case ModelFamily.VERTEXAI_GEMINI_MODELS:
      return LLMProviderType.VERTEX;
    case ModelFamily.BEDROCK_TITAN_MODELS:
    case ModelFamily.BEDROCK_CLAUDE_MODELS:
    case ModelFamily.BEDROCK_LLAMA_MODELS:
    case ModelFamily.BEDROCK_MISTRAL_MODELS:
    case ModelFamily.BEDROCK_NOVA_MODELS:
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS:
      return LLMProviderType.BEDROCK;
    default: {
      const exhaustiveCheck: never = modelFamily;
      throw new Error(`Unknown model family: ${String(exhaustiveCheck)}`);
    }
  }
}

// Register all LLM providers
// Register OpenAI provider
registerProvider(LLMProviderType.OPENAI, (env) => {
  if (!isOpenAIEnv(env)) throw new Error('Invalid model family for OpenAI provider');
  return new OpenAILLM(
    modelProviderMappings[ModelFamily.OPENAI_MODELS],
    env.OPENAI_LLM_API_KEY
  );
});

// Register Azure OpenAI provider
registerProvider(LLMProviderType.AZURE, (env) => {
  if (!isAzureEnv(env)) throw new Error('Invalid model family for Azure OpenAI provider');
  return new AzureOpenAILLM(
    modelProviderMappings[ModelFamily.AZURE_OPENAI_MODELS],
    env.AZURE_LLM_API_KEY,
    env.AZURE_API_ENDPOINT,
    env.AZURE_API_EMBEDDINGS_MODEL,
    env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
    env.AZURE_API_COMPLETIONS_MODEL_SECONDARY
  );
});

// Register VertexAI Gemini provider
registerProvider(LLMProviderType.VERTEX, (env) => {
  if (!isVertexEnv(env)) throw new Error('Invalid model family for VertexAI Gemini provider');
  return new VertexAIGeminiLLM(
    modelProviderMappings[ModelFamily.VERTEXAI_GEMINI_MODELS],
    env.GCP_API_PROJECTID,
    env.GCP_API_LOCATION
  );
});

// Register Bedrock providers (multiple variants)
registerProvider(LLMProviderType.BEDROCK, (env) => {
  if (!isBedrockEnv(env)) {
    throw new Error('Invalid model family for Bedrock provider');
  }

  const bedrockModelFamily = env.LLM;
  switch (bedrockModelFamily) {
    case ModelFamily.BEDROCK_TITAN_MODELS:
      return new BedrockTitanLLM(modelProviderMappings[ModelFamily.BEDROCK_TITAN_MODELS]);
    case ModelFamily.BEDROCK_CLAUDE_MODELS:
      return new BedrockClaudeLLM(modelProviderMappings[ModelFamily.BEDROCK_CLAUDE_MODELS]);
    case ModelFamily.BEDROCK_LLAMA_MODELS:
      return new BedrockLlamaLLM(modelProviderMappings[ModelFamily.BEDROCK_LLAMA_MODELS]);
    case ModelFamily.BEDROCK_MISTRAL_MODELS:
      return new BedrockMistralLLM(modelProviderMappings[ModelFamily.BEDROCK_MISTRAL_MODELS]);
    case ModelFamily.BEDROCK_NOVA_MODELS:
      return new BedrockNovaLLM(modelProviderMappings[ModelFamily.BEDROCK_NOVA_MODELS]);
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS:
      return new BedrockDeepseekLLM(modelProviderMappings[ModelFamily.BEDROCK_DEEPSEEK_MODELS]);
    default: {
      const exhaustiveCheck: never = bedrockModelFamily;
      throw new Error(`Unknown Bedrock model family: ${String(exhaustiveCheck)}`);
    }
  }
}); 