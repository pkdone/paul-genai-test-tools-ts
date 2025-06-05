import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BaseEnvVars } from "../../../../types/env.types";
import llmConfig from "../../../../config/llm.config";

// Environment variable name constants
const VERTEXAI_PROJECTID_KEY = "VERTEXAI_PROJECTID";
const VERTEXAI_LOCATION_KEY = "VERTEXAI_LOCATION";
const VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY = "VERTEXAI_TEXT_EMBEDDINGS_MODEL";
const VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY = "VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY";
const VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY = "VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const VERTEX_GEMINI = "VertexAIGemini";
export const GCP_EMBEDDINGS_TEXT_005 = "GCP_EMBEDDINGS_TEXT_005";
export const GCP_COMPLETIONS_GEMINI_PRO25 = "GCP_COMPLETIONS_GEMINI_PRO25";
export const GCP_COMPLETIONS_GEMINI_FLASH20 = "GCP_COMPLETIONS_GEMINI_FLASH20";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerName: "VertexAI Gemini",
  modelFamily: VERTEX_GEMINI,
  envSchema: z.object({
    [VERTEXAI_PROJECTID_KEY]: z.string().min(1),
    [VERTEXAI_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: GCP_EMBEDDINGS_TEXT_005,
      urnEnvKey: VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 768,
      maxTotalTokens: 2048,
    },
    primaryCompletion: {
      internalKey: GCP_COMPLETIONS_GEMINI_PRO25,
      urnEnvKey: VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
    secondaryCompletion: {
      internalKey: GCP_COMPLETIONS_GEMINI_FLASH20,
      urnEnvKey: VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 1048576,
    },
  },
  errorPatterns: [] as const, // VertexAI has no specific error patterns defined
  providerSpecificConfig: {
    temperature: llmConfig.ZERO_TEMP,
    topP: llmConfig.TOP_P_LOWEST,
    topK: llmConfig.TOP_K_LOWEST,
    requestTimeoutMillis: 6 * 60 * 1000, // 6 minutes - shorter timeout for GCP
    maxRetryAttempts: 3, // Standard retries for Vertex AI
    minRetryDelayMillis: 20 * 1000, // 20 seconds - moderate delay for GCP
    maxRetryAdditionalDelayMillis: 30 * 1000, // 30 seconds additional random delay
    embeddingsTaskType: "QUESTION_ANSWERING",
  },
  factory: (envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const env = envConfig as BaseEnvVars & {
      [VERTEXAI_PROJECTID_KEY]: string;
      [VERTEXAI_LOCATION_KEY]: string;
      [VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY]: string;
      [VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY]: string;
    };
    return new VertexAIGeminiLLM(
      modelsInternallKeySet,
      modelsMetadata,
      errorPatterns,
      env[VERTEXAI_PROJECTID_KEY],
      env[VERTEXAI_LOCATION_KEY],
      providerSpecificConfig
    );
  },
}; 