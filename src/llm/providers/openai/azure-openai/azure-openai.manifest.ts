import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";
import { BaseEnvVars } from "../../../../types/env.types";

// Environment variable name constants
const AZURE_OPENAI_LLM_API_KEY = "AZURE_OPENAI_LLM_API_KEY";
const AZURE_OPENAI_ENDPOINT_KEY = "AZURE_OPENAI_ENDPOINT";
const AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY = "AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT";
const AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY = "AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY";
const AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY = "AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY";
const AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY = "AZURE_OPENAI_ADA_EMBEDDINGS_MODEL";
const AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY = "AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY";
const AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY = "AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY";

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
    [AZURE_OPENAI_LLM_API_KEY]: z.string().min(1),
    [AZURE_OPENAI_ENDPOINT_KEY]: z.string().url(),
    [AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY]: z.string().min(1),
    [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY]: z.string().min(1),
    [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY]: z.string().min(1).optional(),
    [AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: GPT_EMBEDDINGS_ADA002,
      urn: (env) => {
        const value = env[AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_O,
      urn: (env) => {
        const value = env[AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_TURBO,
      urn: (env) => {
        const value = env[AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  factory: (envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    const env = envConfig as BaseEnvVars & {
      [AZURE_OPENAI_LLM_API_KEY]: string;
      [AZURE_OPENAI_ENDPOINT_KEY]: string;
      [AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY]: string;
      [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY]: string;
      [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY]?: string;
      [AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY]: string;
      [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: string;
    };
    return new AzureOpenAILLM(
      modelsInternallKeySet,
      modelsMetadata,
      errorPatterns,
      env[AZURE_OPENAI_LLM_API_KEY],
      env[AZURE_OPENAI_ENDPOINT_KEY],
      env[AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY],
      env[AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY],
      env[AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY] ?? "",
    );
  },
}; 