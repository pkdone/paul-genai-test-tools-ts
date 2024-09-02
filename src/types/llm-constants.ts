import { LLMErrorMsgRegExPattern } from "./llm-types";


/**
 * Set of LLM related constants
 */
export const llmConst = {
  ZERO_TEMP: 0,
  TOP_P_LOWEST: 0,
  TOP_P_VLOW: 0.00001,
  TOP_K_LOWEST: 1,
  OPENAI_GPT_LLM: "OpenAIGPT",
  AZURE_OPENAI_GPT_LLM: "AzureOpenAIGPT",
  GCP_VERTEXAI_GEMINI_LLM: "GcpVertexAIGemini",
  AWS_BEDROCK_TITAN_LLM: "AWSBedrockTitan",
  AWS_BEDROCK_CLAUDE_LLM: "AWSBedrockClaude",
  MIN_RETRY_DELAY_MILLIS: 20 * 1000,
  MAX_RETRY_ADDITIONAL_MILLIS: 30 * 1000,
  REQUEST_WAIT_TIMEOUT_MILLIS: 600 * 1000,
  INVOKE_LLM_NUM_ATTEMPTS: 3,
  TOKEN_LIMIT_SAFETY_CHARS_BUFFER_PERCENTAGE: 1,
  TOKEN_GUESS_REDUCTION_PERCENTAGE: 20,
  RESERVED_COMPLETION_MIN_TOKENS: 2048,
  COMPLETION_TOKEN_MIN_RATIO: 2,
  MINIMUM_CHARS_FOR_PROMPT: 1024,
  GPT_API_EMBEDDINGS_MODEL: "text-embedding-ada-002",
  GPT_API_COMPLETIONS_MODEL_SMALL: "gpt-4",
  GPT_API_COMPLETIONS_MODEL_LARGE: "gpt-4-32k",
  GPT_API_COMPLETIONS_MODEL_XLARGE: "gpt-4-turbo-preview",
  GCP_API_EMBEDDINGS_MODEL_GECKO: "text-embedding-004", //"text-embedding-004:predict", //"text-embedding-004:predict", //"text-embedding-004:predict", //"text-embedding-004", //"text-embedding-004", // "textembedding-gecko"
  GCP_API_COMPLETIONS_MODEL_SMALL_GEMINI: "gemini-1.5-flash-001",
  GCP_API_COMPLETIONS_MODEL_LARGE_GEMINI: "gemini-1.5-pro-001",
  AWS_API_EMBEDDINGS_MODEL: "amazon.titan-embed-text-v1",
  AWS_API_COMPLETIONS_MODEL_SMALL_TITAN: "amazon.titan-text-express-v1",
  AWS_API_COMPLETIONS_MODEL_LARGE_CLAUDE2: "anthropic.claude-v2",
  AWS_API_COMPLETIONS_MODEL_LARGE_CLAUDE3: "anthropic.claude-3-sonnet-20240229-v1:0",
  AWS_API_COMPLETIONS_MODEL_LARGE_CLAUDE35: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  MODEL_NOT_SPECIFIED: "n/a",
  AWS_API_VERSION: "2023-09-30",
  MODEL_TOKENS_PER_CHAR_GUESS: 3.75,
  MODEL_8K_MAX_OUTPUT_TOKENS: 2048,  
  MODEL_32K_MAX_OUTPUT_TOKENS: 8192,  
  MODEL_100K_MAX_OUTPUT_TOKENS: 24576,
  RESPONSE_JSON_CONTENT_TYPE: "application/json",
  RESPONSE_ANY_CONTENT_TYPE: "*/*",
} as const;


/**
 * Const to define the patterns for the error messages for GPT.
 */
export const GPT_ERROR_MSG_TOKENS_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
  {pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens"},
  // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
  {pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens"},
] as const;


/**
 * Const to define the patterns for the error messages for AWS Bedrock.
 */
export const BEDROCK_ERROR_MSG_TOKENS_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
  {pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens"},
  // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
  {pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars"},
] as const;


/**
 * Constant map to define the maximum tokens limit for each model
 */
export const LLM_MODEL_MAX_TOKENS_LIMITS: { [key: string]: number } = {
  "gpt-4": 8_192,
  "gpt-4-32k": 32_768,
  "gpt-4-turbo-preview": 131_072,
  "textembedding-gecko": 8_192,
  "gemini-1.5-flash-001": 1_048_576,
  "gemini-1.5-pro-001": 2_097_152,
  "amazon.titan-embed-text-v1": 8_192,
  "amazon.titan-text-express-v1": 8_192,
  "anthropic.claude-v2": 100_000,
  "anthropic.claude-3-sonnet-20240229-v1:0": 200_000,
  "anthropic.claude-3-5-sonnet-20240620-v1:0": 200_000,
  "test-dummy": 3_000,
} as const;
