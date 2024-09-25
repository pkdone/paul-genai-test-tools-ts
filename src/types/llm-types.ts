
/**
 * Interface for LLM implementation provider
 */
export interface LLMProviderImpl {
  getModelsNames(): LLMConfiguredModelTypesNames,
  getAvailableCompletionModelQualities(): LLMModelQualities[],
  generateEmbeddings: LLMFunction,
  executeCompletionRegular: LLMFunction,
  executeCompletionPremium: LLMFunction,
  close(): Promise<void>,
};


/**
 * Enum to define the LLM API family
 */
export enum LLMApiFamily {
  GPT = "gpt",
  VERTEXAI = "vertexai",
  BEDROCK = "bedrock",
};


/**
 * Enum to define the model quality required (regular, regular+, premium)
 */
export enum LLMModelQualities {
  REGULAR = "regular",
  REGULAR_PLUS = "regular+",
  PREMIUM = "premium",
};


/**
 * Types to define the status types statistics
 */
export type LLMConfiguredModelTypesNames = {
  embeddings: string,
  regular: string,
  premium: string,
};


/**
 * Enum to define the LLM task type
 */
export enum LLMPurpose { 
  EMBEDDINGS = "embeddings",
  COMPLETION = "completion",
};


/**
 * Type to define the main characteristics of the LLM model.
 */
export type LLMModelMetadata = {
  readonly purpose: LLMPurpose;
  readonly maxDimensions?: number;
  readonly maxCompletionTokens?: number;
  readonly maxTotalTokens: number;
  readonly llmApi: LLMApiFamily;
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
export type LLMResponseTokensUsage = {
  readonly promptTokens: number,
  readonly completionTokens: number,
  readonly maxTotalTokens: number,
};


/**
 * Type to define the LLM error
 */
export type LLMGeneratedContent = string | object | number[] | null;


/**
 * Type to define the LLM response
 */ 
export type LLMFunctionResponse = {
  readonly status: LLMResponseStatus,
  readonly request: string,
  readonly model: string,
  readonly context: LLMContext,
  readonly generated?: LLMGeneratedContent,
  readonly tokensUage?: LLMResponseTokensUsage,
};

/**
 * Type to define the embedding or completion function
 */
export type LLMFunction = (content: string, doReturnJSON: boolean, context: LLMContext) => Promise<LLMFunctionResponse>;


/**
 * Type definitions for a partucular status
 */
export type LLMStatsCategoryStatus = {
  readonly description: string,
  readonly symbol: string,
  count: number,
};


/**
 * Type to define the status types
 */ 
export type LLMStatsCategoriesSummary = {
  readonly SUCCESS: LLMStatsCategoryStatus,
  readonly FAILURE: LLMStatsCategoryStatus,
  readonly STEPUP: LLMStatsCategoryStatus,
  readonly RETRY: LLMStatsCategoryStatus,
  readonly CROP: LLMStatsCategoryStatus,
  readonly TOTAL?: LLMStatsCategoryStatus,
};


/**
 * Type to define the pattern definition for the error messages
 */ 
export type LLMErrorMsgRegExPattern = {
  readonly pattern: RegExp,
  readonly units: string,
};
