import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelProviderType } from "../../llm-provider.types";
import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

// Exported model key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_NOVA_PRO_V1 = "AWS_COMPLETIONS_NOVA_PRO_V1";
export const AWS_COMPLETIONS_NOVA_LITE_V1 = "AWS_COMPLETIONS_NOVA_LITE_V1";

export const bedrockNovaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Nova",
  modelFamily: "BedrockNova",
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
      key: AWS_COMPLETIONS_NOVA_PRO_V1,
      urn: "ai21.j2-grande-instruct",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8191,
      maxTotalTokens: 8192,
    },
    secondaryCompletion: {
      key: AWS_COMPLETIONS_NOVA_LITE_V1,
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