import { ModelFamily, ModelProviderType, ModelKey } from "../../types/llm-models-types";
import { LLMModelSet, LLMProviderImpl, LLMModelMetadata, LLMErrorMsgRegExPattern, LLMPurpose } from "../../types/llm-types";
import { EnvVars } from "../../types/env-types";

/**
 * Information about a specific model used by a provider
 */
export interface LLMProviderModelInfo {
  /** The ModelKey identifier for this model */
  key: ModelKey;
  /** The actual model ID/name used by the provider API */
  id: string;
  /** Whether this is an embedding or completion model */
  purpose: LLMPurpose;
  /** Number of dimensions for embedding models */
  dimensions?: number;
  /** Maximum completion tokens for completion models */
  maxCompletionTokens?: number;
  /** Maximum total tokens (prompt + completion) */
  maxTotalTokens: number;
}

/**
 * Complete manifest defining a provider's configuration
 */
export interface LLMProviderManifest {
  /** User-friendly name for the provider */
  providerName: string;
  /** Unique identifier for the provider/family */
  modelFamily: ModelFamily;
  /** The generic type of the provider */
  modelProviderType: ModelProviderType;
  /** Array of environment variable names required by this provider */
  envVarNames: string[];
  /** Model configurations for this provider */
  models: {
    embeddings: LLMProviderModelInfo;
    primaryCompletion: LLMProviderModelInfo;
    secondaryCompletion?: LLMProviderModelInfo;
  };
  /** Provider-specific error patterns for token limits/overload */
  errorPatterns: readonly LLMErrorMsgRegExPattern[];
  /** Factory function to create an instance of the provider's LLMProviderImpl */
  factory: (
    envConfig: Pick<EnvVars, keyof EnvVars>,
    modelSet: LLMModelSet,
    modelsMetadata: Record<ModelKey, LLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[]
  ) => LLMProviderImpl;
} 