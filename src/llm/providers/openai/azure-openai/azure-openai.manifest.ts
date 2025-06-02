import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";
import { BaseEnvVars } from "../../../../types/env.types";
import { getRequiredLLMEnv } from "../../../../utils/llm-env-utils";

// Environment variable name constants
const AZURE_LLM_API_KEY_KEY = "AZURE_LLM_API_KEY";
const AZURE_API_ENDPOINT_KEY = "AZURE_API_ENDPOINT";
const AZURE_API_EMBEDDINGS_MODEL_KEY = "AZURE_API_EMBEDDINGS_MODEL";
const AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY = "AZURE_API_COMPLETIONS_MODEL_PRIMARY";
const AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY = "AZURE_API_COMPLETIONS_MODEL_SECONDARY";
const AZURE_OPENAI_EMBEDDINGS_MODEL_URN_KEY = "AZURE_OPENAI_EMBEDDINGS_MODEL_URN";
const AZURE_OPENAI_COMPLETIONS_MODEL_PRIMARY_URN_KEY = "AZURE_OPENAI_COMPLETIONS_MODEL_PRIMARY_URN";
const AZURE_OPENAI_COMPLETIONS_MODEL_SECONDARY_URN_KEY = "AZURE_OPENAI_COMPLETIONS_MODEL_SECONDARY_URN";

// Exported constants
export const AZURE_OPENAI = "AzureOpenAI";
export const GPT_EMBEDDINGS_ADA002 = "GPT_EMBEDDINGS_ADA002";
export const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
export const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
export const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";
export const GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO";

export const azureOpenAIProviderManifest: LLMProviderManifest = {
  providerName: "Azure OpenAI",
  modelFamily: AZURE_OPENAI,
  envSchema: z.object({
    [AZURE_LLM_API_KEY_KEY]: z.string().min(1),
    [AZURE_API_ENDPOINT_KEY]: z.string().url(),
    [AZURE_API_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1).optional(),
    [AZURE_OPENAI_EMBEDDINGS_MODEL_URN_KEY]: z.string().min(1),
    [AZURE_OPENAI_COMPLETIONS_MODEL_PRIMARY_URN_KEY]: z.string().min(1),
    [AZURE_OPENAI_COMPLETIONS_MODEL_SECONDARY_URN_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: GPT_EMBEDDINGS_ADA002,
      urn: getRequiredLLMEnv(AZURE_OPENAI_EMBEDDINGS_MODEL_URN_KEY),
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_O,
      urn: getRequiredLLMEnv(AZURE_OPENAI_COMPLETIONS_MODEL_PRIMARY_URN_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_TURBO,
      urn: getRequiredLLMEnv(AZURE_OPENAI_COMPLETIONS_MODEL_SECONDARY_URN_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  factory: (envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    const env = envConfig as BaseEnvVars & {
      [AZURE_LLM_API_KEY_KEY]: string;
      [AZURE_API_ENDPOINT_KEY]: string;
      [AZURE_API_EMBEDDINGS_MODEL_KEY]: string;
      [AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY]?: string;
      [AZURE_OPENAI_EMBEDDINGS_MODEL_URN_KEY]: string;
      [AZURE_OPENAI_COMPLETIONS_MODEL_PRIMARY_URN_KEY]: string;
      [AZURE_OPENAI_COMPLETIONS_MODEL_SECONDARY_URN_KEY]: string;
    };
    return new AzureOpenAILLM(
      modelsInternallKeySet,
      modelsMetadata,
      errorPatterns,
      env[AZURE_LLM_API_KEY_KEY],
      env[AZURE_API_ENDPOINT_KEY],
      env[AZURE_API_EMBEDDINGS_MODEL_KEY],
      env[AZURE_API_COMPLETIONS_MODEL_PRIMARY_KEY],
      env[AZURE_API_COMPLETIONS_MODEL_SECONDARY_KEY] ?? "",
    );
  },
}; 