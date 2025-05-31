import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelProviderType } from "../../llm-provider.types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";

// Exported model key constants
export const GPT_EMBEDDINGS_ADA002 = "GPT_EMBEDDINGS_ADA002";
export const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
export const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
export const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";
export const GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO";

export const azureOpenAIProviderManifest: LLMProviderManifest = {
  providerName: "Azure OpenAI",
  modelFamily: "AzureOpenAI",
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
      key: GPT_EMBEDDINGS_ADA002,
      urn: "text-embedding-ada-002",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      key: GPT_COMPLETIONS_GPT4_O,
      urn: "gpt-4o",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      key: GPT_COMPLETIONS_GPT4_TURBO,
      urn: "gpt-4-turbo",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
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