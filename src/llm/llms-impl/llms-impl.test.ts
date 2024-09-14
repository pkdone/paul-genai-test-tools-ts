import AzureOpenAIGPT from "./azure-openai-gpt";
import { GPT_COMPLETIONS_MODEL_GPT4, GPT_COMPLETIONS_MODEL_GPT4_32k, 
         ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35 } from "../../types/llm-models";
import { llmAPIErrorPatterns } from "../../types/llm-constants";
import { extractTokensAmountFromMetadataDefaultingMissingValues, 
   extractTokensAmountAndLimitFromErrorMsg }  from "../llm-response-tools";


test(`AzureOpenAIGPT extract tokens from error msg 1`, () => {
  const errorMsg = "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
  expect(extractTokensAmountAndLimitFromErrorMsg(GPT_COMPLETIONS_MODEL_GPT4, llmAPIErrorPatterns.GPT_ERROR_MSG_TOKENS_PATTERNS, "dummy prompt", errorMsg))
   .toStrictEqual({
      "completionTokens": 5,
      "promptTokens": 10346,
      "maxTotalTokens": 8191
   });
});


test(`AzureOpenAIGPT extract tokens from error msg 2`, () => {
  const errorMsg = "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
  expect(extractTokensAmountAndLimitFromErrorMsg(GPT_COMPLETIONS_MODEL_GPT4, llmAPIErrorPatterns.GPT_ERROR_MSG_TOKENS_PATTERNS, "dummy prompt", errorMsg))
   .toStrictEqual({
      "completionTokens": 0,
      "promptTokens": 8545,
      "maxTotalTokens": 8192
   });
});


test(`AWSBedrockClaude extract tokens from error msg 1`, () => {
  const errorMsg = "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1048576, request input token count: 1049999 ";
  expect(extractTokensAmountAndLimitFromErrorMsg(ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35, llmAPIErrorPatterns.BEDROCK_ERROR_MSG_TOKENS_PATTERNS, "dummy prompt", errorMsg))
   .toStrictEqual({
      "completionTokens": 0,
      "promptTokens": 1049999,
      "maxTotalTokens": 1048576
   });
});


test(`AWSBedrockClaude extract tokens from error msg 2`, () => {
  const errorMsg = "ValidationException: Malformed input request: expected maxLength: 2097152, actual: 2300000, please reformat your input and try again.";
  expect(extractTokensAmountAndLimitFromErrorMsg(ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35, llmAPIErrorPatterns.BEDROCK_ERROR_MSG_TOKENS_PATTERNS, "dummy prompt", errorMsg))
   .toStrictEqual({
      "completionTokens": 0,
      "promptTokens": 219346,
      "maxTotalTokens": 200000
   });
});


test(`AWSBedrockClaude extract tokens from error msg 3`, () => {
   const errorMsg = "Input is too long for requested model.";
   expect(extractTokensAmountAndLimitFromErrorMsg(ANTHROPIC_COMPLETIONS_MODEL_CLAUDE_V35, llmAPIErrorPatterns.BEDROCK_ERROR_MSG_TOKENS_PATTERNS, "dummy prompt", errorMsg))
    .toStrictEqual({
       "completionTokens": 0,
       "promptTokens": 200001,
       "maxTotalTokens": 200000
    });
 });


test(`AbstractLLM extract tokens from metadtata 1`, () => {
   const tokenUsage = {
      promptTokens: 200,
      completionTokens: 0,
      maxTotalTokens: -1,
   };
   expect(extractTokensAmountFromMetadataDefaultingMissingValues(GPT_COMPLETIONS_MODEL_GPT4_32k, tokenUsage))
      .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 200,
         "maxTotalTokens": 32768
   });
 });


 test(`AbstractLLM extract tokens from metadtata 2`, () => {
   const tokenUsage = {
      promptTokens: 32760,
      completionTokens: -1,
      maxTotalTokens: -1,
   };
   expect(extractTokensAmountFromMetadataDefaultingMissingValues(GPT_COMPLETIONS_MODEL_GPT4_32k, tokenUsage))
      .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 32760,
         "maxTotalTokens": 32768
   });
 });


 test(`AbstractLLM extract tokens from metadtata 3`, () => {
   const tokenUsage = {
      promptTokens: -1,
      completionTokens: 200,
      maxTotalTokens: -1,
   };
   expect(extractTokensAmountFromMetadataDefaultingMissingValues(GPT_COMPLETIONS_MODEL_GPT4_32k, tokenUsage))
      .toStrictEqual({
         "completionTokens": 200,
         "promptTokens": 32568,
         "maxTotalTokens": 32768
   });
 });


 test('OpenAIGPT count models', () => {
   const llm = new AzureOpenAIGPT();
   expect(Object.keys(llm.getModelsNames()).length).toBe(3);
 });


 test('AbstractGPT try error overload code', () => {
   const llm = new AzureOpenAIGPT();
   expect(llm.TEST_isLLMOverloaded({ code: 429 })).toBe(true);
 }); 


 test('AbstractGPT try error overload response status', () => {
   const llm = new AzureOpenAIGPT();
   expect(llm.TEST_isLLMOverloaded({ response: { status: 429 } })).toBe(true);
 }); 


 test('AbstractGPT try error token limit exceeded 1', () => {
   const llm = new AzureOpenAIGPT();
   expect(llm.TEST_isTokenLimitExceeded({ code: "context_length_exceeded" })).toBe(true);   
 }); 


 test('AbstractGPT try error token limit exceeded 2', () => {
   const llm = new AzureOpenAIGPT();
   expect(llm.TEST_isTokenLimitExceeded({ type: "invalid_request_error" })).toBe(true);   
 }); 
 