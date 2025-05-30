import { LLMProviderManifest } from "../../llm-provider.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../../types/llm-types";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: ModelFamily.BEDROCK_MISTRAL_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.UNSPECIFIED, // Mistral does not have embeddings models
      urn: "mistral.mistral-large-2402-v1:0", // Placeholder, not actually used
      purpose: LLMPurpose.EMBEDDINGS,
      maxTotalTokens: 0, // Placeholder
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
  errorPatterns: [
    // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
    { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
    // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
    { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
    // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
    { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
  ] as const,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockMistralLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 