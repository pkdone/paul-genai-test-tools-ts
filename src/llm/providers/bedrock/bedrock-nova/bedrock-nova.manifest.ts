import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY, AWS_EMBEDDINGS_TITAN_V1 } from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY";

// Exported model key constants
export const BEDROCK_NOVA = "BedrockNova";
export const AWS_COMPLETIONS_NOVA_LITE_V1 = "AWS_COMPLETIONS_NOVA_LITE_V1";
export const AWS_COMPLETIONS_NOVA_PRO_V1 = "AWS_COMPLETIONS_NOVA_PRO_V1";

export const bedrockNovaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Nova",
  modelFamily: BEDROCK_NOVA,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
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
      internalKey: AWS_COMPLETIONS_NOVA_PRO_V1,
      urn: (env) => {
        const value = env[BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 5000,
      maxTotalTokens: 300000,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_NOVA_LITE_V1,
      urn: (env) => {
        const value = env[BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY] as string;
        if (!value) throw new Error(`Required environment variable ${BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY} is not set`);
        return value;
      },
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 5000,
      maxTotalTokens: 300000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockNovaLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 