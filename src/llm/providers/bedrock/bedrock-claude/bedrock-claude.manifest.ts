import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

export const bedrockClaudeProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Claude",
  modelFamily: ModelFamily.BEDROCK_CLAUDE_MODELS,
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
      key: ModelKey.AWS_COMPLETIONS_CLAUDE_V37,
      urn: "anthropic.claude-3-opus-20240229-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4088,
      maxTotalTokens: 132000, 
    },
    secondaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_CLAUDE_V40,
      urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4088,
      maxTotalTokens: 200000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockClaudeLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 