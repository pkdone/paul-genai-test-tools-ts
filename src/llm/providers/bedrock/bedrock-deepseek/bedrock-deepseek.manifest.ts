import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import { BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY, AWS_EMBEDDINGS_TITAN_V1 } from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY";

// Exported constants
export const BEDROCK_DEEPSEEK = "BedrockDeepseek";
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
      urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_DEEPSEEKE_R1,
      urnEnvKey: BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns, _providerSpecificConfig) => {
    return new BedrockDeepseekLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 