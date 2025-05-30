import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

export const bedrockNovaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Nova",
  modelFamily: ModelFamily.BEDROCK_NOVA_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.UNSPECIFIED, // Nova does not have embeddings models
      urn: "ai21.j2-grande-instruct", // Placeholder, not actually used
      purpose: LLMPurpose.EMBEDDINGS,
      maxTotalTokens: 0, // Placeholder
    },
    primaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_NOVA_PRO_V1,
      urn: "ai21.j2-grande-instruct",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8191,
      maxTotalTokens: 8192,
    },
    secondaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_NOVA_LITE_V1,
      urn: "ai21.j2-mid",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8191,
      maxTotalTokens: 8192,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockNovaLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 