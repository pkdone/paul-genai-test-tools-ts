import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockTitanLLM from "./bedrock-titan-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

export const bedrockTitanProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Titan",
  modelFamily: ModelFamily.BEDROCK_TITAN_MODELS,
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
      key: ModelKey.AWS_COMPLETIONS_TITAN_EXPRESS_V1,
      urn: "amazon.titan-text-express-v1",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8000,
      maxTotalTokens: 8000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockTitanLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 