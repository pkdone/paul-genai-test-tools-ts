/**
 * Enum to define the model sizes
 */
export enum LLMModelSize {
  SMALL = "small",
  SMALL_PLUS = "small+",
  MEDIUM = "medium",
  LARGE = "large",
};


/**
 * Types to define the status types statistics
 */
export type LLMModelSizeNames = {
  embeddings: string,
  small: string,
  large: string,
};


/**
 * Enum to define the LLM task type
 */
export enum LLMInvocationPurpose { 
  EMBEDDINGS = "embeddings",
  COMPLETION = "completion",
};


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
export type LLMResponseTokensUsage = {
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
};


/**
 * Type to define the LLM error
 */
export type LLMGeneratedContent = string | number[] | null;


/**
 * Type to define the LLM response
 */ 
export type LLMFunctionResponse = {
  status: LLMResponseStatus,
  request: string,
  context: LLMContext,
  generated?: LLMGeneratedContent,
  tokensUage?: LLMResponseTokensUsage,
};


/**
 * Type to define the embedding or completion function
 */
export type LLMFunction = (content: string, doReturnJSON: boolean, context: LLMContext) => Promise<LLMFunctionResponse>;


/**
 * Interface for LLM provider
 */
export interface LLMProviderImpl {
  getModelsNames(): LLMModelSizeNames,
  getAvailableCompletionModelSizes(): LLMModelSize[],
  generateEmbeddings: LLMFunction,
  executeCompletionSmall: LLMFunction,
  executeCompletionLarge: LLMFunction,
  close(): Promise<void>,
};


/**
 * Type to define the LLM error and its various optional properties
 */
export type LLMError = {
  code?: number | string,
  status?: number | string,
  type?: string,
  error?: {
    code?: number | string
  },
  response?: {
    status?: number
  },
  context?: LLMContext,
  "$metadata"?: {
    httpStatusCode: number,
  },
};


/**
 * Type definitions for a partucular status
 */
export type LLMStatsCategoryStatus = {
  description: string,
  symbol: string,
  count: number,
};


/**
 * Type to define the status types
 */ 
export type LLMStatsCategoriesSummary = {
  SUCCESS: LLMStatsCategoryStatus,
  FAILURE: LLMStatsCategoryStatus,
  STEPUP: LLMStatsCategoryStatus,
  RETRY: LLMStatsCategoryStatus,
  CROP: LLMStatsCategoryStatus,
  TOTAL?: LLMStatsCategoryStatus,
};


/**
 * Type to define the pattern definition for the error messages
 */ 
export type LLMErrorMsgRegExPattern = {
  pattern: RegExp,
  units: string,
};
