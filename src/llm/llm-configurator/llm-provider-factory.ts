import { ModelFamily, ModelProviderType } from "../../types/llm-models-types";
import { bedrockModelFamilyToProvider, modelFamilyToModelKeyMappings, modelFamilyToProviderMap } from "../../config/llm.config";
import { LLMProviderImpl } from "../../types/llm-types";
import { EnvVars, isOpenAIEnv, isAzureEnv, isVertexEnv, isBedrockEnv } from "../../types/env-types";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import { BadConfigurationLLMError } from "../../types/llm-errors";

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
  if (!factory) throw new BadConfigurationLLMError(`No LLM provider registered for type: ${providerType}`);
  return factory(env);
}

/**
 * Helper function to determine provider type from model family
 */
function getProviderTypeFromModelFamily(modelFamily: ModelFamily): ModelProviderType {
  const providerType = modelFamilyToProviderMap.get(modelFamily);
  if (providerType === undefined) throw new BadConfigurationLLMError(`Unknown model family: ${String(modelFamily)}`);
  return providerType;
}

// Register OpenAI provider
registerProvider(ModelProviderType.OPENAI, (env) => {
  if (!isOpenAIEnv(env)) throw new BadConfigurationLLMError('Invalid model family for OpenAI provider');
  return new OpenAILLM(
    modelFamilyToModelKeyMappings[ModelFamily.OPENAI_MODELS],
    env.OPENAI_LLM_API_KEY
  );
});

// Register Azure OpenAI provider
registerProvider(ModelProviderType.AZURE, (env) => {
  if (!isAzureEnv(env)) throw new BadConfigurationLLMError('Invalid model family for Azure OpenAI provider');
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
  if (!isVertexEnv(env)) throw new BadConfigurationLLMError('Invalid model family for VertexAI Gemini provider');
  return new VertexAIGeminiLLM(
    modelFamilyToModelKeyMappings[ModelFamily.VERTEXAI_GEMINI_MODELS],
    env.GCP_API_PROJECTID,
    env.GCP_API_LOCATION
  );
});

// Register Bedrock providers (multiple variants)
registerProvider(ModelProviderType.BEDROCK, (env) => {
  if (!isBedrockEnv(env)) {
    throw new BadConfigurationLLMError('Invalid model family for Bedrock provider');
  }

  const bedrockModelFamily = env.LLM;
  const providerConstructor = bedrockModelFamilyToProvider.get(bedrockModelFamily);
  
  if (providerConstructor) {
    return providerConstructor(modelFamilyToModelKeyMappings[bedrockModelFamily]);
  } else {
    throw new BadConfigurationLLMError(`Unknown Bedrock model family: ${String(bedrockModelFamily)}`);
  }
}); 