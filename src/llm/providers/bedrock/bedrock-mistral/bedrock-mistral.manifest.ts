import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: ModelFamily.BEDROCK_MISTRAL_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE2,
      urn: "mistral.mistral-large-2402-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 32000,
      maxTotalTokens: 32000,
    },
    secondaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE,
      urn: "mistral.mistral-large-2402-v1:0",
      maxCompletionTokens: 8192,
      maxTotalTokens: 32768,
      purpose: LLMPurpose.COMPLETIONS,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockMistralLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 