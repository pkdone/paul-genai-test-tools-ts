import { LLMProviderManifest } from "../../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../../types/llm-types";

export const bedrockClaudeProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Claude",
  modelFamily: ModelFamily.BEDROCK_CLAUDE_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.UNSPECIFIED, // Claude does not have embeddings models
      urn: "anthropic.claude-v2", // Placeholder, not actually used
      purpose: LLMPurpose.EMBEDDINGS,
      maxTotalTokens: 0, // Placeholder
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
  errorPatterns: [
    // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
    { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
    // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
    { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
    // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
    { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
  ] as const,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockClaudeLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 