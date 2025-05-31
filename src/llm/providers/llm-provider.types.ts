import { LLMModelSet, LLMProviderImpl, LLMModelMetadata, LLMErrorMsgRegExPattern, LLMGeneratedContent, LLMResponseTokensUsage } from "../../types/llm-types";
import { EnvVars } from "../../types/env-types";

/**
 * GENERAL NOTES:
 *  - For Completionss LLMs, the total allowed tokens is the sum of the prompt tokens and the
 *    completions tokens.
 *
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 *
 */ 

/**
 * Enum for model provider types - used for coarse-grained platform categorization
 */
export enum ModelProviderType {
  N_A = "n/a",
  OPENAI = "OpenAI",
  AZURE = "Azure",
  VERTEXAI = "VertexAI",
  BEDROCK = "Bedrock"
}

/**
 * Complete manifest defining a provider's configuration
 */
export interface LLMProviderManifest {
  /** User-friendly name for the provider */
  providerName: string;
  /** Unique identifier for the provider/family - changed to string to decouple from ModelFamily enum */
  modelFamily: string;
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
    modelsMetadata: Record<string, LLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[]
  ) => LLMProviderImpl;
}

/**
 * Type to define the summary of the processed LLM implementation's response.
 */
export interface LLMImplSpecificResponseSummary {
  isIncompleteResponse: boolean;
  responseContent: LLMGeneratedContent;
  tokenUsage: LLMResponseTokensUsage;
}
