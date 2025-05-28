import { LLMProviderManifest } from "../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../types/llm-models-types";
import BedrockMistralLLM from "../../llms-impl/bedrock/bedrock-mistral-llm";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: ModelFamily.BEDROCK_MISTRAL_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
      id: "amazon.titan-embed-text-v1",
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE2,
      id: "mistral.mistral-large-2407-v1:0",
      maxCompletionTokens: 8192,
      maxTotalTokens: 131072,
    },
    secondaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE,
      id: "mistral.mistral-large-2402-v1:0",
      maxCompletionTokens: 8192,
      maxTotalTokens: 32768,
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