import { ModelFamily, ModelProviderType, ModelKey, ModelFamilyToModelKeyMappings } from "../types/llm-models-types";
import { LLMModelSet, LLMErrorMsgRegExPattern, LLMProviderImpl } from "../types/llm-types";
import BedrockTitanLLM from "../llm/llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llm/llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llm/llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llm/llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llm/llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llm/llms-impl/bedrock/bedrock-deepseek-llm";

/**
 * LLM (Large Language Model) configuration.
 */
export const llmConfig = {
  MIN_RETRY_DELAY_MILLIS: 20 * 1000,
  MAX_RETRY_ADDITIONAL_MILLIS: 30 * 1000,
  REQUEST_WAIT_TIMEOUT_MILLIS: 7 * 60 * 1000,
  INVOKE_LLM_NUM_ATTEMPTS: 3,
  COMPLETION_MAX_TOKENS_LIMIT_BUFFER: 5,
  COMPLETION_TOKENS_REDUCE_MIN_RATIO: 0.75, 
  PROMPT_TOKENS_REDUCE_MIN_RATIO: 0.85, 
  MODEL_CHARS_PER_TOKEN_ESTIMATE: 2.8,
  ZERO_TEMP: 0,
  TOP_P_LOWEST: 0,
  TOP_P_VLOW: 0.00001,
  TOP_K_LOWEST: 1,
  LLM_UTF8_ENCODING: "utf8",
  LLM_RESPONSE_JSON_CONTENT_TYPE: "application/json",
  LLM_RESPONSE_ANY_CONTENT_TYPE: "*/*",
  AZURE_API_VERION: "2025-01-01-preview",
  AWS_ANTHROPIC_API_VERSION: "bedrock-2023-05-31",
  GCP_API_EMBEDDINGS_TASK_TYPE: "QUESTION_ANSWERING",
  DEFAULT_VECTOR_DIMENSIONS_AMOUNT: 1536,
  DEFAULT_VECTOR_SIMILARITY_TYPE: "euclidean",  // euclidean | cosine | dotProduct
  DEFAULT_VECTOR_QUANTIZATION_TYPE: "scalar",   // scalar | binary
  VECTOR_SEARCH_NUM_CANDIDATES: 150,
  VECTOR_SEARCH_NUM_LIMIT: 6,
} as const;

/**
 * Map of model families to their corresponding provider types
 */
export const modelFamilyToProviderMap = new Map<ModelFamily, ModelProviderType>([
  [ModelFamily.OPENAI_MODELS, ModelProviderType.OPENAI],
  [ModelFamily.AZURE_OPENAI_MODELS, ModelProviderType.AZURE],
  [ModelFamily.VERTEXAI_GEMINI_MODELS, ModelProviderType.VERTEXAI],
  [ModelFamily.BEDROCK_TITAN_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_CLAUDE_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_LLAMA_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_MISTRAL_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_NOVA_MODELS, ModelProviderType.BEDROCK],
  [ModelFamily.BEDROCK_DEEPSEEK_MODELS, ModelProviderType.BEDROCK],
]);

/**
 * Map of Bedrock model families to their corresponding provider constructors
 */
export const bedrockModelFamilyToProvider = new Map<ModelFamily, (keys: LLMModelSet) => LLMProviderImpl>([
  [ModelFamily.BEDROCK_TITAN_MODELS, (keys: LLMModelSet) => new BedrockTitanLLM(keys)],
  [ModelFamily.BEDROCK_CLAUDE_MODELS, (keys: LLMModelSet) => new BedrockClaudeLLM(keys)],
  [ModelFamily.BEDROCK_LLAMA_MODELS, (keys: LLMModelSet) => new BedrockLlamaLLM(keys)],
  [ModelFamily.BEDROCK_MISTRAL_MODELS, (keys: LLMModelSet) => new BedrockMistralLLM(keys)],
  [ModelFamily.BEDROCK_NOVA_MODELS, (keys: LLMModelSet) => new BedrockNovaLLM(keys)],
  [ModelFamily.BEDROCK_DEEPSEEK_MODELS, (keys: LLMModelSet) => new BedrockDeepseekLLM(keys)],
]);

/**
 * Constants for the LLM model mappings for each provider.
 */
export const modelFamilyToModelKeyMappings: ModelFamilyToModelKeyMappings = {
  [ModelFamily.OPENAI_MODELS]: {
    embeddings: ModelKey.GPT_EMBEDDINGS_TEXT_3SMALL,
    primaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_O,
    secondaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_TURBO,
  },
  [ModelFamily.AZURE_OPENAI_MODELS]: {
    embeddings: ModelKey.GPT_EMBEDDINGS_ADA002,
    primaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_O,
    secondaryCompletion: ModelKey.GPT_COMPLETIONS_GPT4_32k,
  },
  [ModelFamily.VERTEXAI_GEMINI_MODELS]: {
    embeddings: ModelKey.GCP_EMBEDDINGS_TEXT_005,
    primaryCompletion: ModelKey.GCP_COMPLETIONS_GEMINI_PRO25,
    secondaryCompletion: ModelKey.GCP_COMPLETIONS_GEMINI_FLASH20,
  },
  [ModelFamily.BEDROCK_TITAN_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_TITAN_EXPRESS_V1,
  },
  [ModelFamily.BEDROCK_CLAUDE_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_CLAUDE_V37,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_CLAUDE_V35,
  },
  [ModelFamily.BEDROCK_MISTRAL_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE2,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_MISTRAL_LARGE,
  },
  [ModelFamily.BEDROCK_LLAMA_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT,
  },
  [ModelFamily.BEDROCK_NOVA_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_NOVA_PRO_V1,
    secondaryCompletion: ModelKey.AWS_COMPLETIONS_NOVA_LITE_V1,
  },
  [ModelFamily.BEDROCK_DEEPSEEK_MODELS]: {
    embeddings: ModelKey.AWS_EMBEDDINGS_TITAN_V1,
    primaryCompletion: ModelKey.AWS_COMPLETIONS_DEEPSEEKE_R1,
  },
} as const;

/**
 * Set of LLM error message patterns
 */
export const llmAPIErrorPatterns: Readonly<Record<string, readonly LLMErrorMsgRegExPattern[]>> = {
  [ModelProviderType.OPENAI]: [
    // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
    { pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens" },
    // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
    { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens" },
  ] as const,
  [ModelProviderType.BEDROCK]: [
    // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
    { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
    // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
    { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
    // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
    { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
  ] as const,
  [ModelProviderType.VERTEXAI]: [] as const,
} as const;


