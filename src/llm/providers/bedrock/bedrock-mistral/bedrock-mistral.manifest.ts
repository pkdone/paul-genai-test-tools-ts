import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";

// Exported constants
export const BEDROCK_MISTRAL = "BedrockMistral";
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";
export const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: BEDROCK_MISTRAL,
  envSchema: z.object({}),
  models: {
    embeddings: {
      internalKey: AWS_EMBEDDINGS_TITAN_V1,
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_MISTRAL_LARGE2,
      urn: "mistral.mistral-large-2407-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 131072,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_MISTRAL_LARGE,
      urn: "mistral.mistral-large-2402-v1:0",
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