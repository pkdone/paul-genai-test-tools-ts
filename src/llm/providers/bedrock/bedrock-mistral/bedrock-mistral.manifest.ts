import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

// Exported model key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";
export const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: "BedrockMistral",
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
      key: AWS_COMPLETIONS_MISTRAL_LARGE2,
      urn: "mistral.mistral-large-2402-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 32000,
      maxTotalTokens: 32000,
    },
    secondaryCompletion: {
      key: AWS_COMPLETIONS_MISTRAL_LARGE,
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