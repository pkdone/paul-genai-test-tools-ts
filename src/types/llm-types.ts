
/**
 * Interface for LLM implementation provider
 */
export interface LLMProviderImpl {
  getModelsNames(): LLMConfiguredModelTypesNames,
  getAvailableCompletionModelQualities(): LLMModelQuality[],
  generateEmbeddings: LLMFunction,
  executeCompletionRegular: LLMFunction,
  executeCompletionPremium: LLMFunction,
  close(): Promise<void>,
};


/**
 * Enum to define the model quality required (regular, regular+, premium)
 */
export enum LLMModelQuality {
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
  N_A = "n/a",
  EMBEDDINGS = "embeddings",
  COMPLETIONS = "completions",
};


/**
 * Enum to define the LLM API family
 */
export enum LLMApiFamily {
  N_A = "n/a",
  OPENAI = "OpenAI",
  VERTEXAI = "VertexAI",
  BEDROCK = "Bedrock",
};


/**
 * Type to define the main characteristics of the LLM model.
 */
export type LLMModelMetadata = {
  readonly modelId: string;
  readonly purpose: LLMPurpose;
  readonly maxDimensions?: number;
  readonly maxCompletionTokens?: number;
  readonly maxTotalTokens: number;
  readonly apiFamily: LLMApiFamily;
}


/**
 * Intermediate type to use when moving JSON data to final strongly typed LLMModelMetadata type
 */
export type JSONLLMModelMetadata = {
  readonly modelId?: string;
  readonly purpose?: string;
  readonly maxDimensions?: number;
  readonly maxCompletionTokens?: number;
  readonly maxTotalTokens?: number;
  readonly apiFamily?: string;
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
  readonly modelKey: string,
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


/**
 * Enum to define the LLM model family.
 */
export enum ModelFamily {
  OPENAI_MODELS = "OpenAI",
  AZURE_OPENAI_MODELS = "AzureOpenAI",
  VERTEXAI_GEMINI_MODELS = "VertexAIGemini",
  BEDROCK_TITAN_MODELS = "BedrockTitan",
  BEDROCK_CLAUDE_MODELS = "BedrockClaude",
  BEDROCK_LLAMA_MODELS = "BedrockLlama",
  BEDROCK_MISTRAL_MODELS = "BedrockMistral"
};


/**
 * Enum to define the keys of the service provider-speciifc exposed LLM models.
 */
export enum ModelKey {
  UNSPECIFIED = "UNSPECIFIED",
  GPT_EMBEDDINGS_ADA002 = "GPT_EMBEDDINGS_ADA002",
  GPT_EMBEDDINGS_TEXT_3SMALL = "GPT_EMBEDDINGS_TEXT_3SMALL",
  GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4",
  GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k",
  GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO",
  GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O",
  GCP_EMBEDDINGS_ADA_GECKO = "GCP_EMBEDDINGS_ADA_GECKO",
  GCP_COMPLETIONS_GEMINI_FLASH15 = "GCP_COMPLETIONS_GEMINI_FLASH15",
  GCP_COMPLETIONS_GEMINI_PRO15 = "GCP_COMPLETIONS_GEMINI_PRO15",
  AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1",
  AWS_COMPLETIONS_TITAN_EXPRESS_V1 = "AWS_COMPLETIONS_TITAN_EXPRESS_V1",
  AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35",
  AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT",
  AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT",
  AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT",
  AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE",
  AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2"
};
