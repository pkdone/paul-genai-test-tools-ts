import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelProviderType } from "../../llm-provider.types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

// Exported model key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_DEEPSEEKE_R1 = "AWS_COMPLETIONS_DEEPSEEKE_R1";

export const bedrockDeepseekProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Deepseek",
  modelFamily: "BedrockDeepseek",
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: AWS_EMBEDDINGS_TITAN_V1,
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      key: AWS_COMPLETIONS_DEEPSEEKE_R1,
      urn: "deepseek.coder-v2-lite-instruct",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockDeepseekLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 