import { LLMProviderManifest } from "../../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../../types/llm-types";

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: ModelFamily.BEDROCK_LLAMA_MODELS,
  modelProviderType: ModelProviderType.BEDROCK,
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: ModelKey.UNSPECIFIED, // Llama does not have embeddings models
      urn: "meta.llama3-70b-instruct-v1:0", // Placeholder, not actually used
      purpose: LLMPurpose.EMBEDDINGS,
      maxTotalTokens: 0, // Placeholder
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