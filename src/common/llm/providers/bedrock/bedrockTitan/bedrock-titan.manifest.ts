import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockTitanLLM from "./bedrock-titan-llm";
import { LLMPurpose } from "../../../llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY, AWS_EMBEDDINGS_TITAN_V1 } from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY";

// Exported constants
export const BEDROCK_TITAN = "BedrockTitan";
export const AWS_COMPLETIONS_TITAN_EXPRESS_V1 = "AWS_COMPLETIONS_TITAN_EXPRESS_V1";

export const bedrockTitanProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Titan",
  modelFamily: BEDROCK_TITAN,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: AWS_EMBEDDINGS_TITAN_V1,
      urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_TITAN_EXPRESS_V1,
      urnEnvKey: BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8191,
      maxTotalTokens: 8191,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    requestTimeoutMillis: 7 * 60 * 1000, // 7 minutes - Titan is generally faster than other Bedrock models
    maxRetryAttempts: 3, // Standard retries for Titan
    minRetryDelayMillis: 20 * 1000, // 20 seconds
    maxRetryAdditionalDelayMillis: 30 * 1000, // 30 seconds additional random delay
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, _providerSpecificConfig) => {
    return new BedrockTitanLLM(modelsKeysSet, modelsMetadata, errorPatterns);
  },
}; 