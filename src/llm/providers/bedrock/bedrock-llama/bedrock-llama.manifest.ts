import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";

// Exported constants 
export const BEDROCK_LLAMA = "BedrockLlama";
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT"

/**
 * AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT: Not clear if
 * 'maxCompletionsTokens' is actually less than listed value of 8192
 */

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: BEDROCK_LLAMA,
  envSchema: z.object({}),
  models: {
    embeddings: {
      internalKey: AWS_EMBEDDINGS_TITAN_V1,
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
      urn: "us.meta.llama3-3-70b-instruct-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
      urn: "us.meta.llama3-2-90b-instruct-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockLlamaLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 