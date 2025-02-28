import { assembleLLMModelMetadataFromJSON } from "../llm/llm-metadata-initializer";
import { LLMApiFamily, LLMErrorMsgRegExPattern } from "./llm-types";
import jsonLlmModelsData from "../llm/llm-models.json";

/**
 * Set of LLM related constants
 */
export const llmConst = {
  REGULAR_MODEL_QUALITY_NAME: "regular",
  PREMIUM_MODEL_QUALITY_NAME: "premium",
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
} as const;

/**
 * Validate the llm-model.json contents and bring them into a strongly const object.
 * 
 * GENERAL NOTES:
 *  - For Completions LLMs, the total allowed tokens is the sum of the prompt tokens and the 
 *    completion tokens.
 * 
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 * 
 * SPECIFIC LLM NOTES:
 *  - GCP_COMPLETIONS_GEMINI_FLASH15: For some reason the listed 'maxCompletionTokens' value of 8192
 *    isn't always hit for Flash15, so not clear if it is actually higher than for Pro which, if it,
 *    is, would be a bit weird
 * 
 *  - AWS_COMPLETIONS_CLAUDE_V35: According to Anthropic site, the 'maxCompletionTokens' should be 
 *    8192 but Bedrock seems to cut this short to usually 4095 or 4096 but have seen 4090 reported 
 *    for some LLM responses, so using a few tokens buffer to come up with a limit of 4088
 * 
 *  - AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT: Not clear if
 *    'maxCompletionTokens' is actually less than listed value of 8192
 */
export const llmModels = assembleLLMModelMetadataFromJSON(jsonLlmModelsData);

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
