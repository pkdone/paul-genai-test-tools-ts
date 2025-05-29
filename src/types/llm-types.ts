import { ModelKey, ModelFamily } from "./llm-models-types";
import { z } from "zod";

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
  readonly id: string;
  readonly purpose: LLMPurpose;
  readonly dimensions?: number;
  readonly maxCompletionTokens?: number;
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

/**
 * Zod schema for LLMModelMetadata validation
 */
export const llmModelMetadataSchema = z.object({
  id: z.string().min(1, "Model ID cannot be empty"),
  purpose: z.nativeEnum(LLMPurpose),
  dimensions: z.number().positive().optional(),
  maxCompletionTokens: z.number().positive().optional(),
  maxTotalTokens: z.number().positive(),
}).refine((data) => {
  // Require dimensions for embeddings models
  if (data.purpose === LLMPurpose.EMBEDDINGS && !data.dimensions) {
    return false;
  }
  // Require maxCompletionTokens for completions models
  if (data.purpose === LLMPurpose.COMPLETIONS && !data.maxCompletionTokens) {
    return false;
  }
  // Ensure maxCompletionTokens doesn't exceed maxTotalTokens
  if (data.maxCompletionTokens && data.maxCompletionTokens > data.maxTotalTokens) {
    return false;
  }
  return true;
}, {
  message: "Invalid model metadata configuration"
});

/**
 * Zod schema for LLMModelSet validation
 */
export const llmModelSetSchema = z.object({
  embeddings: z.nativeEnum(ModelKey),
  primaryCompletion: z.nativeEnum(ModelKey),
  secondaryCompletion: z.nativeEnum(ModelKey).optional(),
});

