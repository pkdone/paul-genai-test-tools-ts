import { LLMErrorMsgRegExPattern } from "../../types/llm-types";
import { ModelProviderType } from "../../types/llm-models-types";

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


/* TODO: Need to deal with the followingnew  Bedrock Claude 4.0 validation error msg
 ValidationException. input length and `max_tokens` exceed context limit: 164035 + 64000 > 204658, decrease input length or `max_tokens` and try again - ValidationException: input length and `max_tokens` exceed context limit: 164035 + 64000 > 204658, decrease input length or `max_tokens` and try again
    at de_ValidationExceptionRes (/home/pdone/Projects/paul-genai-test-tools-ts/node_modules/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js:1699:21)
    at de_CommandError (/home/pdone/Projects/paul-genai-test-tools-ts/node_modules/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js:1516:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async /home/pdone/Projects/paul-genai-test-tools-ts/node_modules/@smithy/middleware-serde/dist-cjs/index.js:35:20
    at async /home/pdone/Projects/paul-genai-test-tools-ts/node_modules/@smithy/core/dist-cjs/index.js:193:18
    at async /home/pdone/Projects/paul-genai-test-tools-ts/node_modules/@smithy/middleware-retry/dist-cjs/index.js:320:38
    at async /home/pdone/Projects/paul-genai-test-tools-ts/node_modules/@aws-sdk/middleware-logger/dist-cjs/index.js:33:22
    at async BedrockClaudeLLM.invokeImplementationSpecificLLM (/home/pdone/Projects/paul-genai-test-tools-ts/dist/llm/llms-impl/bedrock/base-bedrock-llm.js:55:29)
    at async BedrockClaudeLLM.executeLLMImplFunction (/home/pdone/Projects/paul-genai-test-tools-ts/dist/llm/llms-impl/base/abstract-llm.js:93:75)
    at async executeFunctionWithTimeout (/home/pdone/Projects/paul-genai-test-tools-ts/dist/utils/control-utils.js:86:18)
error-utils.ts:8
*/