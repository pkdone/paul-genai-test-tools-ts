import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY, AWS_EMBEDDINGS_TITAN_V1 } from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_MISTRAL = "BedrockMistral";
export const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";
export const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: BEDROCK_MISTRAL,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
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
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_MISTRAL_LARGE2,
      urn: (env) => {
        const value = env[BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 131072,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_MISTRAL_LARGE,
      urn: (env) => {
        const value = env[BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY} is not set`);
        return value;
      },
      maxCompletionTokens: 8192,
      maxTotalTokens: 32768,
      purpose: LLMPurpose.COMPLETIONS,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockMistralLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 