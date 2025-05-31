import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: ModelFamily.BEDROCK_LLAMA_MODELS,
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
      key: ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT,
      urn: "meta.llama3-70b-instruct-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 8192,
    },
    secondaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT,
      urn: "meta.llama3-8b-instruct-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 8192,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockLlamaLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 