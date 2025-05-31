import { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../../types/llm-types";

// Exported model key constants
export const GCP_EMBEDDINGS_TEXT_005 = "GCP_EMBEDDINGS_TEXT_005";
export const GCP_COMPLETIONS_GEMINI_PRO25 = "GCP_COMPLETIONS_GEMINI_PRO25";
export const GCP_COMPLETIONS_GEMINI_FLASH20 = "GCP_COMPLETIONS_GEMINI_FLASH20";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerName: "VertexAI Gemini",
  modelFamily: "VertexAIGemini",
  envVarNames: ["GCP_API_PROJECTID", "GCP_API_LOCATION"],
  models: {
    embeddings: {
      key: GCP_EMBEDDINGS_TEXT_005,
      urn: "text-embedding-005",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 768,
      maxTotalTokens: 2048,
    },
    primaryCompletion: {
      key: GCP_COMPLETIONS_GEMINI_PRO25,
      urn: "gemini-2.5-pro-preview-05-06",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
    secondaryCompletion: {
      key: GCP_COMPLETIONS_GEMINI_FLASH20,
      urn: "gemini-2.0-flash-001",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 1048576,
    },
  },
  errorPatterns: [] as const, // VertexAI has no specific error patterns defined
  factory: (envConfig, modelSet, modelsMetadata, errorPatterns) => {
    const env = envConfig as {
      GCP_API_PROJECTID: string;
      GCP_API_LOCATION: string;
    };
    return new VertexAIGeminiLLM(
      modelSet,
      modelsMetadata,
      errorPatterns,
      env.GCP_API_PROJECTID,
      env.GCP_API_LOCATION
    );
  },
}; 