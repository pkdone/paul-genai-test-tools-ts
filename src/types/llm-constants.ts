import { LLM_API_FAMILY, LLMErrorMsgRegExPattern } from "./llm-types";

/**
 * Set of LLM related constants
 */
export const llmConst = {
  OPENAI_GPT_MODELS: "OpenAIGPT",
  AZURE_OPENAI_GPT_MODELS: "AzureOpenAIGPT",
  GCP_VERTEXAI_GEMINI_MODELS: "GcpVertexAIGemini",
  AWS_BEDROCK_TITAN_MODELS: "AWSBedrockTitan",
  AWS_BEDROCK_CLAUDE_MODELS: "AWSBedrockClaude",
  AWS_BEDROCK_LLAMA_MODELS: "AWSBedrockLlama",
  AWS_BEDROCK_MISTRAL_MODELS: "AWSBedrockMistral",
  REGULAR_MODEL_QUALITY_NAME: "regular",
  PREMIUM_MODEL_QUALITY_NAME: "premium",
  MIN_RETRY_DELAY_MILLIS: 20 * 1000,
  MAX_RETRY_ADDITIONAL_MILLIS: 30 * 1000,
  REQUEST_WAIT_TIMEOUT_MILLIS: 8 * 60 * 1000,
  INVOKE_LLM_NUM_ATTEMPTS: 3,
  COMPLETION_MAX_TOKENS_LIMIT_BUFFER: 5,
  COMPLETION_TOKENS_REDUCE_MIN_RATIO: 0.75, 
  PROMPT_TOKENS_REDUCE_MIN_RATIO: 0.85, 
  MODEL_CHARS_PER_TOKEN_ESTIMATE: 2.8,
  AWS_API_VERSION: "2023-09-30",
  AWS_ANTHROPIC_API_VERSION: "bedrock-2023-05-31",
  RESPONSE_JSON_CONTENT_TYPE: "application/json",
  RESPONSE_ANY_CONTENT_TYPE: "*/*",
  ZERO_TEMP: 0,
  TOP_P_LOWEST: 0,
  TOP_P_VLOW: 0.00001,
  TOP_K_LOWEST: 1,
} as const;


/**
 * Set of LLM error message patterns
 */
export const llmAPIErrorPatterns: Readonly<{ [key: string]: LLMErrorMsgRegExPattern[] }> = {
  [LLM_API_FAMILY.GPT]: [
    // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
    { pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens" },
    // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
    { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens" },
  ] as const,
  [LLM_API_FAMILY.BEDROCK]: [
    // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
    { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
    // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
    { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
    // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
    { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
  ] as const,  
  [LLM_API_FAMILY.VERTEXAI]: [
  ] as const,
} as const;
