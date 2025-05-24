import { ModelFamily, ModelFamilyToModelKeyMappings, ModelKey, ModelProviderType } from "../../types/llm-models-types";
import { LLMModelSet, LLMProviderImpl } from "../../types/llm-types";
import { EnvVars, isOpenAIEnv, isAzureEnv, isVertexEnv, isBedrockEnv } from "../../types/env-types";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import { BadConfigurationLLMError } from "../../types/llm-errors";
import BedrockTitanLLM from "../llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llms-impl/bedrock/bedrock-deepseek-llm";

/**
 * Map of model families to their corresponding provider types
 */
export const modelFamilyToProviderMap = new Map<ModelFamily, ModelProviderType>([
  [ModelFamily.OPENAI_MODELS, ModelProviderType.OPENAI],
  [ModelFamily.AZURE_OPENAI_MODELS, ModelProviderType.AZURE],
  [ModelFamily.VERTEXAI_GEMINI_MODELS, ModelProviderType.VERTEXAI],
  [ModelFamily.BEDROCK_TITAN_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_CLAUDE_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_LLAMA_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_MISTRAL_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_NOVA_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_DEEPSEEK_MODELS, ModelProviderType.BEDROCK],
]);

/**
 * Map of Bedrock model families to their corresponding provider constructors
 */
const bedrockModelFamilyToProvider = new Map<ModelFamily, (keys: LLMModelSet) => LLMProviderImpl>([
  [ModelFamily.BEDROCK_TITAN_MODELS, (keys: LLMModelSet) => new BedrockTitanLLM(keys)],
  [ModelFamily.BEDROCK_CLAUDE_MODELS, (keys: LLMModelSet) => new BedrockClaudeLLM(keys)],
  [ModelFamily.BEDROCK_LLAMA_MODELS, (keys: LLMModelSet) => new BedrockLlamaLLM(keys)],
  [ModelFamily.BEDROCK_MISTRAL_MODELS, (keys: LLMModelSet) => new BedrockMistralLLM(keys)],
  [ModelFamily.BEDROCK_NOVA_MODELS, (keys: LLMModelSet) => new BedrockNovaLLM(keys)],
  [ModelFamily.BEDROCK_DEEPSEEK_MODELS, (keys: LLMModelSet) => new BedrockDeepseekLLM(keys)],
]);

/**
 * Constants for the LLM model mappings for each provider.
 */
export const modelFamilyToModelKeyMappings: ModelFamilyToModelKeyMappings = {
  [ModelFamily.OPENAI_MODELS]: {
    embeddings: ModelKey.GPT_EMBEDDINGS_TEXT_3SMALL,
    primaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_O,
    secondaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_TURBO,
  },
  [ModelFamily.AZURE_OPENAI_MODELS]: {
    embeddings: ModelKey.GPT_EMBEDDINGS_ADA002,
    primaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_O,
    secondaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_32k,
  },
  [ModelFamily.VERTEXAI_GEMINI_MODELS]: {
    embeddings: ModelKey.GCP_EMBEDDINGS_TEXT_005,
    primaryCompletion: ModelKey.GCP_COMPLETIONS_GEMINI_PRO25,
    secondaryCompletion: ModelKey.GCP_COMPLETIONS_GEMINI_FLASH20,
  },
  [ModelFamily.BEDROCK_TITAN_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_TITAN_EXPRESS_V1,
  },
  [ModelFamily.BEDROCK_CLAUDE_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_CLAUDE_V37,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_CLAUDE_V35,
  },
  [ModelFamily.BEDROCK_MISTRAL_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE2,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE,
  },
  [ModelFamily.BEDROCK_LLAMA_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT,
  },
  [ModelFamily.BEDROCK_NOVA_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_NOVA_PRO_V1,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_NOVA_LITE_V1,
  },
  [ModelFamily.BEDROCK_DEEPSEEK_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_DEEPSEEKE_R1,
  },
} as const;
 
// Import of llmAPIErrorPatterns moved to the import section

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
