import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockTitanLLM from "./bedrock-titan-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { getRequiredLLMEnv } from "../../../../utils/llm-env-utils";

// Environment variable name constants
const BEDROCK_EMBEDDINGS_MODEL_KEY = "BEDROCK_EMBEDDINGS_MODEL";
const BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY";

// Exported constants
export const BEDROCK_TITAN = "BedrockTitan";
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_TITAN_EXPRESS_V1 = "AWS_COMPLETIONS_TITAN_EXPRESS_V1";

export const bedrockTitanProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Titan",
  modelFamily: BEDROCK_TITAN,
  envSchema: z.object({
    [BEDROCK_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
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
      internalKey: AWS_COMPLETIONS_TITAN_EXPRESS_V1,
      urn: getRequiredLLMEnv(BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8191,
      maxTotalTokens: 8191,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockTitanLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 