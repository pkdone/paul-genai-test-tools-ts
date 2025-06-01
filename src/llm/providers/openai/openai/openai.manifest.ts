import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import OpenAILLM from "./openai-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";
import { BaseEnvVars } from "../../../../types/env.types";

// Environment variable name constants
const OPENAI_LLM_API_KEY_KEY = "OPENAI_LLM_API_KEY";

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
  }),
  models: {
    embeddings: {
      internalKey: GPT_EMBEDDINGS_TEXT_3SMALL,
      urn: "text-embedding-3-small",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_O,
      urn: "gpt-4o",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      internalKey: GPT_COMPLETIONS_GPT4_TURBO,
      urn: "gpt-4-turbo",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  factory: (envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    const env = envConfig as BaseEnvVars & { [OPENAI_LLM_API_KEY_KEY]: string };
    return new OpenAILLM(modelsInternallKeySet, modelsMetadata, errorPatterns, env[OPENAI_LLM_API_KEY_KEY]);
  },
}; 