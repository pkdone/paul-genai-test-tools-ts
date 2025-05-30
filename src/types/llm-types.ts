import { ModelKey, ModelFamily } from "./llm-models-types";

/**
 * Interface for LLM implementation provider
 */
export interface LLMProviderImpl {
  generateEmbeddings: LLMFunction,
  executeCompletionPrimary: LLMFunction,
  executeCompletionSecondary: LLMFunction,
  getModelsNames(): string[],
  getAvailableCompletionModelQualities(): LLMModelQuality[],
  getEmbeddedModelDimensions(): number | undefined,
  getModelFamily(): ModelFamily,
  getModelsMetadata(): Readonly<Record<string, LLMModelMetadata>>,
  close(): Promise<void>,
};

/**
 * Enum to define the model quality required (primary, secondary)
 */
export enum LLMModelQuality {
  PRIMARY = "primary",
  SECONDARY = "secondary",
};

/**
 * Types to define the status types statistics
 */
export interface LLMModelSet {
  embeddings: ModelKey,
  primaryCompletion: ModelKey,
  secondaryCompletion?: ModelKey,
}

/**
 * Enum to define the LLM task type
 */
export enum LLMPurpose { 
  N_A = "n/a",
  EMBEDDINGS = "embeddings",
  COMPLETIONS = "completions",
};

/**
 * Type to define the main characteristics of the LLM model.
 */
export interface LLMModelMetadata {
  /** The ModelKey identifier for this model */
  readonly key: ModelKey;
  /** The actual model ID/name used by the provider API */
  readonly urn: string;
  /** Whether this is an embedding or completion model */
  readonly purpose: LLMPurpose;
  /** Number of dimensions for embedding models */
  readonly dimensions?: number;
  /** Maximum completion tokens for completion models */
  readonly maxCompletionTokens?: number;
  /** Maximum total tokens (prompt + completion) */
  readonly maxTotalTokens: number;
}

/**
 * Type to define the context object that is passed to and from the LLM provider
 */
export type LLMContext = Record<string, unknown>;

/**
 * Enum to define the LLM task type
 */
export enum LLMResponseStatus { 
  UNKNOWN = "unknown",
  COMPLETED = "completed",
  EXCEEDED = "exceeded",
  OVERLOADED = "overloaded",
};

/**
 * Type to define the token counts
 */ 
export interface LLMResponseTokensUsage {
  readonly promptTokens: number,
  readonly completionTokens: number,
  readonly maxTotalTokens: number,
}

/**
 * Type to define the LLM error
 */
export type LLMGeneratedContent = string | Record<string, unknown> | number[] | null;

/**
 * Type to define the LLM response
 */ 
export interface LLMFunctionResponse {
  readonly status: LLMResponseStatus,
  readonly request: string,
  readonly modelKey: ModelKey,
  readonly context: LLMContext,
  readonly generated?: LLMGeneratedContent,
  readonly tokensUage?: LLMResponseTokensUsage,
};

/**
 * Type to define the embedding or completion function
 */
export type LLMFunction = (content: string, asJson: boolean, context: LLMContext) => Promise<LLMFunctionResponse>;

/**
 * Type definitions for a partucular status
 */
export interface LLMStatsCategoryStatus {
  readonly description: string,
  readonly symbol: string,
  count: number,
};

/**
 * Type to define the status types
 */ 
export interface LLMStatsCategoriesSummary {
  readonly SUCCESS: LLMStatsCategoryStatus,
  readonly FAILURE: LLMStatsCategoryStatus,
  readonly SWITCH: LLMStatsCategoryStatus,
  readonly RETRY: LLMStatsCategoryStatus,
  readonly CROP: LLMStatsCategoryStatus,
  readonly TOTAL?: LLMStatsCategoryStatus,
};

/**
 * Type to define the pattern definition for the error messages
 */ 
export interface LLMErrorMsgRegExPattern {
  readonly pattern: RegExp,
  readonly units: string,
};
