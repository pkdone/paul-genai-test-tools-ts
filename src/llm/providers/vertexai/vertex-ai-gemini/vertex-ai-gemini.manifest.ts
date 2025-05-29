import { LLMProviderManifest } from "../../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../../types/llm-models-types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../../types/llm-types";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerName: "VertexAI Gemini",
  modelFamily: ModelFamily.VERTEXAI_GEMINI_MODELS,
  modelProviderType: ModelProviderType.VERTEXAI,
  envVarNames: ["GCP_API_PROJECTID", "GCP_API_LOCATION"],
  models: {
    embeddings: {
      key: ModelKey.GCP_EMBEDDINGS_TEXT_005,
      id: "text-embedding-005",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 768,
      maxTotalTokens: 2048,
    },
    primaryCompletion: {
      key: ModelKey.GCP_COMPLETIONS_GEMINI_PRO25,
      id: "gemini-2.5-pro-preview-05-06",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
    secondaryCompletion: {
      key: ModelKey.GCP_COMPLETIONS_GEMINI_FLASH20,
      id: "gemini-2.0-flash-001",
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