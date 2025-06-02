import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { getRequiredLLMEnv } from "../../../../utils/llm-env-utils";

// Environment variable name constants
const BEDROCK_EMBEDDINGS_MODEL_KEY = "BEDROCK_EMBEDDINGS_MODEL";
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_MISTRAL = "BedrockMistral";
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";
export const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: BEDROCK_MISTRAL,
  envSchema: z.object({
    [BEDROCK_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: AWS_EMBEDDINGS_TITAN_V1,
      urn: getRequiredLLMEnv(BEDROCK_EMBEDDINGS_MODEL_KEY),
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_MISTRAL_LARGE2,
      urn: getRequiredLLMEnv(BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 131072,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_MISTRAL_LARGE,
      urn: getRequiredLLMEnv(BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY),
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