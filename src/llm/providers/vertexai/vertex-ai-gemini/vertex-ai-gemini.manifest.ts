import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BaseEnvVars } from "../../../../types/env.types";
import { getRequiredLLMEnv } from "../../../../utils/llm-env-utils";

// Environment variable name constants
const GCP_API_PROJECTID_KEY = "GCP_API_PROJECTID";
const GCP_API_LOCATION_KEY = "GCP_API_LOCATION";
const VERTEXAI_EMBEDDINGS_MODEL_KEY = "VERTEXAI_EMBEDDINGS_MODEL";
const VERTEXAI_COMPLETIONS_MODEL_PRIMARY_KEY = "VERTEXAI_COMPLETIONS_MODEL_PRIMARY";
const VERTEXAI_COMPLETIONS_MODEL_SECONDARY_KEY = "VERTEXAI_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const VERTEX_GEMINI = "VertexAIGemini";
export const GCP_EMBEDDINGS_TEXT_005 = "GCP_EMBEDDINGS_TEXT_005";
export const GCP_COMPLETIONS_GEMINI_PRO25 = "GCP_COMPLETIONS_GEMINI_PRO25";
export const GCP_COMPLETIONS_GEMINI_FLASH20 = "GCP_COMPLETIONS_GEMINI_FLASH20";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerName: "VertexAI Gemini",
  modelFamily: VERTEX_GEMINI,
  envSchema: z.object({
    [GCP_API_PROJECTID_KEY]: z.string().min(1),
    [GCP_API_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [VERTEXAI_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [VERTEXAI_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: GCP_EMBEDDINGS_TEXT_005,
      urn: getRequiredLLMEnv(VERTEXAI_EMBEDDINGS_MODEL_KEY),
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 768,
      maxTotalTokens: 2048,
    },
    primaryCompletion: {
      internalKey: GCP_COMPLETIONS_GEMINI_PRO25,
      urn: getRequiredLLMEnv(VERTEXAI_COMPLETIONS_MODEL_PRIMARY_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
    secondaryCompletion: {
      internalKey: GCP_COMPLETIONS_GEMINI_FLASH20,
      urn: getRequiredLLMEnv(VERTEXAI_COMPLETIONS_MODEL_SECONDARY_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 1048576,
    },
  },
  errorPatterns: [] as const, // VertexAI has no specific error patterns defined
  factory: (envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    const env = envConfig as BaseEnvVars & {
      [GCP_API_PROJECTID_KEY]: string;
      [GCP_API_LOCATION_KEY]: string;
      [VERTEXAI_EMBEDDINGS_MODEL_KEY]: string;
      [VERTEXAI_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [VERTEXAI_COMPLETIONS_MODEL_SECONDARY_KEY]: string;
    };
    return new VertexAIGeminiLLM(
      modelsInternallKeySet,
      modelsMetadata,
      errorPatterns,
      env[GCP_API_PROJECTID_KEY],
      env[GCP_API_LOCATION_KEY]
    );
  },
}; 