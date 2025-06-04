import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY, AWS_EMBEDDINGS_TITAN_V1 } from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY";

// Exported constants 
export const BEDROCK_LLAMA = "BedrockLlama";
export const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT";

/**
 * AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT: Not clear if
 * 'maxCompletionsTokens' is actually less than listed value of 8192
 */

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: BEDROCK_LLAMA,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: AWS_EMBEDDINGS_TITAN_V1,
      urn: (env) => {
        const value = env[BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
      urn: (env) => {
        const value = env[BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
      urn: (env) => {
        const value = env[BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockLlamaLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 