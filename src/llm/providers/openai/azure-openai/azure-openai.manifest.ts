import { LLMProviderManifest } from "../../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../../types/llm-types";

export const azureOpenAIProviderManifest: LLMProviderManifest = {
  providerName: "Azure OpenAI",
  modelFamily: ModelFamily.AZURE_OPENAI_MODELS,
  modelProviderType: ModelProviderType.AZURE,
  envVarNames: [
    "AZURE_LLM_API_KEY",
    "AZURE_API_ENDPOINT",
    "AZURE_API_EMBEDDINGS_MODEL",
    "AZURE_API_COMPLETIONS_MODEL_PRIMARY",
    "AZURE_API_COMPLETIONS_MODEL_SECONDARY"
  ],
  models: {
    embeddings: {
      key: ModelKey.GPT_EMBEDDINGS_ADA002,
      id: "text-embedding-ada-002",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      key: ModelKey.GPT_COMPLETIONS_GPT4_O,
      id: "gpt-4o",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      key: ModelKey.GPT_COMPLETIONS_GPT4_TURBO,
      id: "gpt-4-turbo",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: [
    // Same as OpenAI patterns since Azure uses OpenAI models
    { pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens" },
    { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens" },
  ] as const,
  factory: (envConfig, modelSet, modelsMetadata, errorPatterns) => {
    const env = envConfig as {
      AZURE_LLM_API_KEY: string;
      AZURE_API_ENDPOINT: string;
      AZURE_API_EMBEDDINGS_MODEL: string;
      AZURE_API_COMPLETIONS_MODEL_PRIMARY: string;
      AZURE_API_COMPLETIONS_MODEL_SECONDARY: string;
    };
    return new AzureOpenAILLM(
      modelSet,
      modelsMetadata,
      errorPatterns,
      env.AZURE_LLM_API_KEY,
      env.AZURE_API_ENDPOINT,
      env.AZURE_API_EMBEDDINGS_MODEL,
      env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
      env.AZURE_API_COMPLETIONS_MODEL_SECONDARY
    );
  },
}; 