import { LLMProviderManifest } from "../../llm-provider.types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";

// Environment variable name constants
const AZURE_LLM_API_KEY_KEY = "AZURE_LLM_API_KEY";
const AZURE_API_ENDPOINT_KEY = "AZURE_API_ENDPOINT";
const AZURE_API_EMBEDDINGS_MODEL_KEY = "AZURE_API_EMBEDDINGS_MODEL";
const AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY = "AZURE_API_COMPLETIONS_MODEL_PRIMARY";
const AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY = "AZURE_API_COMPLETIONS_MODEL_SECONDARY";

// Exported model key constants
export const GPT_EMBEDDINGS_ADA002 = "GPT_EMBEDDINGS_ADA002";
export const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
export const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
export const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";
export const GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO";

export const azureOpenAIProviderManifest: LLMProviderManifest = {
  providerName: "Azure OpenAI",
  modelFamily: "AzureOpenAI",
  envVarNames: [
    AZURE_LLM_API_KEY_KEY,
    AZURE_API_ENDPOINT_KEY,
    AZURE_API_EMBEDDINGS_MODEL_KEY,
    AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY,
    AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY
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
      maxCompletionTokens: 16384,
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
      [AZURE_LLM_API_KEY_KEY]: string;
      [AZURE_API_ENDPOINT_KEY]: string;
      [AZURE_API_EMBEDDINGS_MODEL_KEY]: string;
      [AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY]: string;
    };
    return new AzureOpenAILLM(
      modelSet,
      modelsMetadata,
      errorPatterns,
      env[AZURE_LLM_API_KEY_KEY],
      env[AZURE_API_ENDPOINT_KEY],
      env[AZURE_API_EMBEDDINGS_MODEL_KEY],
      env[AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY],
      env[AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY]
    );
  },
}; 