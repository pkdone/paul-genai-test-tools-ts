import { LLMProviderManifest } from "../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../types/llm-models-types";
import BedrockLlamaLLM from "../../llms-impl/bedrock/bedrock-llama-llm";

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: ModelFamily.BEDROCK_LLAMA_MODELS,
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
      key: ModelKey.AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
      id: "us.meta.llama3-3-70b-instruct-v1:0",
      maxCompletionTokens: 8192,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      key: ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT,
      id: "meta.llama3-70b-instruct-v1:0",
      maxCompletionTokens: 8192,
      maxTotalTokens: 8192,
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
    return new BedrockLlamaLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 