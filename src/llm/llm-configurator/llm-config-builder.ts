import { EnvVars } from "../../types/env-types";
import { BedrockVariantType, LLMProviderType } from "../../types/llm-config-types";

/**
 * Helper function to extract OpenAI configuration from environment variables
 */
export function getOpenAIConfig(env: EnvVars) {
  return {
    llmProviderType: LLMProviderType.OPENAI,
    apiKey: env.OPENAI_LLM_API_KEY,
  } as const;
}

/**
 * Helper function to extract Azure OpenAI configuration from environment variables
 */
export function getAzureOpenAIConfig(env: EnvVars) {
  return {
    llmProviderType: LLMProviderType.AZURE,
    apiKey: env.AZURE_LLM_API_KEY,
    apiEndpoint: env.AZURE_API_ENDPOINT,
    embeddingsModel: env.AZURE_API_EMBEDDINGS_MODEL,
    completionsModelPrimary: env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
    completionsModelSecondary: env.AZURE_API_COMPLETIONS_MODEL_SECONDARY,
  } as const;
}

/**
 * Helper function to extract VertexAI configuration from environment variables
 */
export function getVertexAIConfig(env: EnvVars) {
  return {
    llmProviderType: LLMProviderType.VERTEX,
    projectId: env.GCP_API_PROJECTID,
    location: env.GCP_API_LOCATION,
  } as const;
}

/**
 * Helper function to extract Bedrock configuration from environment variables
 */
export function getBedrockConfig(_env: EnvVars, variant: BedrockVariantType) {
  return {
    llmProviderType: LLMProviderType.BEDROCK,
    variant,
  } as const;
} 