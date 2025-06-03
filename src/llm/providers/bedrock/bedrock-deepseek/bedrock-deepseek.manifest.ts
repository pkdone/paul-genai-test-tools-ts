import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";

// Environment variable name constants
const BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY = "BEDROCK_TITAN_EMBEDDINGS_MODEL";
const BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY";

// Exported constants
export const BEDROCK_DEEPSEEK = "BedrockDeepseek";
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_DEEPSEEKE_R1 = "AWS_COMPLETIONS_DEEPSEEKE_R1";

export const bedrockDeepseekProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Deepseek",
  modelFamily: BEDROCK_DEEPSEEK,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
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
      internalKey: AWS_COMPLETIONS_DEEPSEEKE_R1,
      urn: (env) => {
        const value = env[BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockDeepseekLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 