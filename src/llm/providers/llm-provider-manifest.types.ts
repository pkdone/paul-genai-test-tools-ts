import { ModelFamily, ModelProviderType, ModelKey } from "../../types/llm-models-types";
import { LLMModelSet, LLMProviderImpl, LLMModelMetadata, LLMErrorMsgRegExPattern } from "../../types/llm-types";
import { EnvVars } from "../../types/env-types";

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
    embeddings: LLMModelMetadata;
    primaryCompletion: LLMModelMetadata;
    secondaryCompletion?: LLMModelMetadata;
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