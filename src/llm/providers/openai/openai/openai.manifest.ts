import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import OpenAILLM from "./openai-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";
import { BaseEnvVars } from "../../../../types/env.types";

// Environment variable name constants
const OPENAI_LLM_API_KEY_KEY = "OPENAI_LLM_API_KEY";
const OPENAI_TEXT_EMBEDDINGS_MODEL_KEY = "OPENAI_TEXT_EMBEDDINGS_MODEL";
const OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY = "OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY";
const OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY = "OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const OPENAI = "OpenAI";
export const GPT_EMBEDDINGS_TEXT_3SMALL = "GPT_EMBEDDINGS_TEXT_3SMALL";
export const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";
export const GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO";

export const openAIProviderManifest: LLMProviderManifest = {
  providerName: "OpenAI GPT",
  modelFamily: OPENAI,
  envSchema: z.object({
    [OPENAI_LLM_API_KEY_KEY]: z.string().min(1),
    [OPENAI_TEXT_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: GPT_EMBEDDINGS_TEXT_3SMALL,
      urn: (env) => {
        const value = env[OPENAI_TEXT_EMBEDDINGS_MODEL_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${OPENAI_TEXT_EMBEDDINGS_MODEL_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_O,
      urn: (env) => {
        const value = env[OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_TURBO,
      urn: (env) => {
        const value = env[OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY} is not set`);
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
      [OPENAI_LLM_API_KEY_KEY]: string;
      [OPENAI_TEXT_EMBEDDINGS_MODEL_KEY]: string;
      [OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: string;
    };
    return new OpenAILLM(modelsInternallKeySet, modelsMetadata, errorPatterns, env[OPENAI_LLM_API_KEY_KEY]);
  },
}; 