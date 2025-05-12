import { ModelFamily, modelProviderMappings } from "../../types/llm-models-metadata";
import { EnvVars } from "../../types/env-types";
import { AzureOpenAIProviderConfig, BedrockProviderConfig, LLMProviderConfig, OpenAIProviderConfig,
         VertexAIGeminiProviderConfig } from "../../types/llm-provider-config";

/**
 * Creates a provider-specific configuration based on the selected LLM family.
 * This decouples the configuration creation from the actual LLM implementation instantiation.
 * 
 * @param env The environment variables
 * @returns A provider-specific configuration
 */
export function createLLMConfig(env: EnvVars): LLMProviderConfig {
  const modelFamily = env.LLM as ModelFamily;
  const models = modelProviderMappings[modelFamily];

  switch (modelFamily) {
    case ModelFamily.OPENAI_MODELS:
      return {
        modelFamily,
        models,
        apiKey: env.OPENAI_LLM_API_KEY
      } as OpenAIProviderConfig;

    case ModelFamily.AZURE_OPENAI_MODELS:
      return {
        modelFamily,
        models,
        apiKey: env.AZURE_LLM_API_KEY,
        endpoint: env.AZURE_API_ENDPOINT,
        embeddingsDeployment: env.AZURE_API_EMBEDDINGS_MODEL,
        completionsDeploymentPrimary: env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
        completionsDeploymentSecondary: env.AZURE_API_COMPLETIONS_MODEL_SECONDARY
      } as AzureOpenAIProviderConfig;

    case ModelFamily.VERTEXAI_GEMINI_MODELS:
      return {
        modelFamily,
        models,
        projectId: env.GCP_API_PROJECTID,
        location: env.GCP_API_LOCATION
      } as VertexAIGeminiProviderConfig;

    case ModelFamily.BEDROCK_TITAN_MODELS:
    case ModelFamily.BEDROCK_CLAUDE_MODELS:
    case ModelFamily.BEDROCK_LLAMA_MODELS:
    case ModelFamily.BEDROCK_MISTRAL_MODELS:
    case ModelFamily.BEDROCK_NOVA_MODELS:
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS:
      return {
        modelFamily,
        models,
        providerType: 'bedrock'
      } as BedrockProviderConfig;
  }
} 