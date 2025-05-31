import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

// Exported model key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";

/**
 * AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT: Not clear if
 * 'maxCompletionsTokens' is actually less than listed value of 8192
 */

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: "BedrockLlama",
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
      key: AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT,
      urn: "meta.llama3-70b-instruct-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 8192,
    },
    secondaryCompletion: {
      key: AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT,
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