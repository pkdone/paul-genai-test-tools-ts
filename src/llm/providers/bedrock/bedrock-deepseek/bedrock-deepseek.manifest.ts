import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

export const bedrockDeepseekProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Deepseek",
  modelFamily: ModelFamily.BEDROCK_DEEPSEEK_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.UNSPECIFIED, // Deepseek does not have embeddings models
      urn: "deepseek.coder-v2-lite-instruct", // Placeholder, not actually used
      purpose: LLMPurpose.EMBEDDINGS,
      maxTotalTokens: 0, // Placeholder
    },
    primaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_DEEPSEEKE_R1,
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