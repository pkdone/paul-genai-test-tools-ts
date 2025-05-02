import { LLMApiFamily, LLMErrorMsgRegExPattern } from "./llm-types";

/**
 * Set of LLM related constants
 */
export const llmConst = {
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
 * Set of LLM error message patterns
 */
export const llmAPIErrorPatterns: Readonly<Record<string, readonly LLMErrorMsgRegExPattern[]>> = {
  [LLMApiFamily.OPENAI]: [
    // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
    { pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens" },
    // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
    { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens" },
  ] as const,
  [LLMApiFamily.BEDROCK]: [
    // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
    { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
    // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
    { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
    // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
    { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
  ] as const,  
  [LLMApiFamily.VERTEXAI]: [
  ] as const,
} as const;
