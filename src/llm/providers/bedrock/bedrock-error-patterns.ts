/**
 * Common error patterns for Bedrock model providers
 */

export const BEDROCK_COMMON_ERROR_PATTERNS = [
  // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
  { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
  // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
  { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
  // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
  { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
] as const;
