// EnvVars import removed as it's no longer needed after making manifests declarative

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
  getModelFamily(): string,
  getModelsMetadata(): Readonly<Record<string, ResolvedLLMModelMetadata>>,
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
export interface LLMModelKeysSet {
  embeddingsModelKey: string,
  primaryCompletionModelKey: string,
  secondaryCompletionModelKey?: string,
}

/**
 * Enum to define the LLM task type
 */
export enum LLMPurpose { 
  EMBEDDINGS = "embeddings",
  COMPLETIONS = "completions",
};

/**
 * Base interface for LLM model metadata containing all common fields.
 * 
 * Notes:
 *  - For Completions LLMs, the total allowed tokens is the sum of the prompt tokens and the
 *    completion tokens.
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 */ 
interface BaseLLMModelMetadata {
  /** The string identifier for this model - changed from ModelKey enum to string */
  readonly modelKey: string;
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
 * Type to define the main characteristics of the LLM model with declarative URN resolution.
 */ 
export interface LLMModelMetadata extends BaseLLMModelMetadata {
  /** The environment variable key that contains the actual model ID/name used by the provider API */
  readonly urnEnvKey: string;
}

/**
 * Type to define resolved model metadata where URNs are always strings.
 * This is used in LLM implementations after environment resolution.
 */ 
export interface ResolvedLLMModelMetadata extends BaseLLMModelMetadata {
  /** The actual model ID/name used by the provider API - always a resolved string */
  readonly urn: string;
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
  readonly modelKey: string,
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
  readonly isMaxFirst: boolean,
};


