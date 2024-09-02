import OpenAIGPT from "./openai-gpt";
import { llmConst, GPT_ERROR_MSG_TOKENS_PATTERNS, BEDROCK_ERROR_MSG_TOKENS_PATTERNS }
   from "../../types/llm-constants";


test(`AbstractLLM extra tokens from error msg 1 - GPT`, () => {
  const llm = new OpenAIGPT();
  const errorMsg = "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
  expect(llm.TEST_extractTokensAmountAndLimitFromErrorMsg("gpt-4", GPT_ERROR_MSG_TOKENS_PATTERNS, errorMsg))
   .toStrictEqual({
      "completionTokens": 5,
      "promptTokens": 10346,
      "totalTokens": 8191
   });
});


test(`AbstractLLM extract tokens from error msg 2 - GPT`, () => {
  const llm = new OpenAIGPT();
  const errorMsg = "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
  expect(llm.TEST_extractTokensAmountAndLimitFromErrorMsg("gpt-4", GPT_ERROR_MSG_TOKENS_PATTERNS, errorMsg))
   .toStrictEqual({
      "completionTokens": 0,
      "promptTokens": 8545,
      "totalTokens": 8192
   });
});


test(`AbstractLLM extract tokens from error msg 1 - VertexAI`, () => {
  const llm = new OpenAIGPT();
  const errorMsg = "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1048576, request input token count: 1049999 ";
  expect(llm.TEST_extractTokensAmountAndLimitFromErrorMsg("gemini-1.5-flash-001", BEDROCK_ERROR_MSG_TOKENS_PATTERNS, errorMsg))
   .toStrictEqual({
      "completionTokens": 0,
      "promptTokens": 1049999,
      "totalTokens": 1048576
   });
});


test(`AbstractLLM extract tokens from error msg 2 - VertexAI`, () => {
  const llm = new OpenAIGPT();
  const errorMsg = "ValidationException: Malformed input request: expected maxLength: 2097152, actual: 2300000, please reformat your input and try again.";
  expect(llm.TEST_extractTokensAmountAndLimitFromErrorMsg("gemini-1.5-pro-001", BEDROCK_ERROR_MSG_TOKENS_PATTERNS, errorMsg))
   .toStrictEqual({
      "completionTokens": 0,
      "promptTokens": 2300000,
      "totalTokens": 2097152
   });
});


test(`AbstractLLM extract tokens from metadtata 1`, () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_extractTokensAmountFromMetadataOrGuessFromContent("test-dummy", "xxxxxxxxxxxxxx", "", 0, 0, null))
      .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 3001,
         "totalTokens": 3000
   });
 });


 test(`AbstractLLM extract tokens from metadtata 2`, () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_extractTokensAmountFromMetadataOrGuessFromContent("test-dummy", "x", "", 2801, 200, null))
    .toStrictEqual({
       "completionTokens": 200,
       "promptTokens": 2801,
       "totalTokens": 3000
    });
 });


 test(`AbstractLLM extract tokens from metadtata 3`, () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_extractTokensAmountFromMetadataOrGuessFromContent("test-dummy", "x", "yyyyyyyy", 2999, 0, null))
    .toStrictEqual({
       "completionTokens": 2,
       "promptTokens": 2999,
       "totalTokens": 3000
    });
 });


 test(`AbstractLLM extract tokens from metadtata 4`, () => {
   const llm = new OpenAIGPT();
   const prompt = "x".repeat(2805 * llmConst.MODEL_TOKENS_PER_CHAR_GUESS);    
   const response = "y".repeat(200 * llmConst.MODEL_TOKENS_PER_CHAR_GUESS);    
   expect(llm.TEST_extractTokensAmountFromMetadataOrGuessFromContent("test-dummy", prompt, response, 0, 0, null))
    .toStrictEqual({
       "completionTokens": 200,
       "promptTokens": 2804,
       "totalTokens": 3000
    });
 });


 test('OpenAIGPT count models', () => {
   const llm = new OpenAIGPT();
   expect(Object.keys(llm.getModelsNames()).length).toBe(3);
 });


 test('AbstractGPT try error overload code', () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_isLLMOverloaded({ code: 429 })).toBe(true);
 }); 


 test('AbstractGPT try error overload response status', () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_isLLMOverloaded({ response: { status: 429 } })).toBe(true);
 }); 


 test('AbstractGPT try error token limit exceeded 1', () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_isTokenLimitExceeded({ code: "context_length_exceeded" })).toBe(true);   
 }); 


 test('AbstractGPT try error token limit exceeded 2', () => {
   const llm = new OpenAIGPT();
   expect(llm.TEST_isTokenLimitExceeded({ type: "invalid_request_error" })).toBe(true);   
 }); 
 