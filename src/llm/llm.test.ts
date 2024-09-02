import LLMRouter from "./llm-router";
import { llmConst, LLM_MODEL_MAX_TOKENS_LIMITS } from "../types/llm-constants";
const llmRouter = new LLMRouter(llmConst.OPENAI_GPT_LLM, false);


test(`LLMRouter reduce prompt size 1`, () => {
  const prompt = "x".repeat(4000); 
  expect(llmRouter.TEST_reducePromptSizeToTokenLimit(prompt, { promptTokens: prompt.length, completionTokens: 0, totalTokens: 3800 }, 0).length).toBe(1752);
});


test(`LLMRouter reduce prompt size 2`, () => {
  const prompt = "x".repeat(6200); 
  const modelTokensLimit = LLM_MODEL_MAX_TOKENS_LIMITS[llmConst.GPT_API_COMPLETIONS_MODEL_SMALL];
  expect(llmRouter.TEST_reducePromptSizeToTokenLimit(prompt, { promptTokens: prompt.length, completionTokens: 2100, totalTokens: modelTokensLimit }, 0).length).toBe(3992);
});


test(`LLMRouter reduce prompt size 3`, () => {
   const prompt = "x".repeat(25000); 
   const modelTokensLimit = LLM_MODEL_MAX_TOKENS_LIMITS[llmConst.GPT_API_COMPLETIONS_MODEL_SMALL];
   expect(llmRouter.TEST_reducePromptSizeToTokenLimit(prompt, { promptTokens: (prompt.length / llmConst.MODEL_TOKENS_PER_CHAR_GUESS), completionTokens: 100, totalTokens: modelTokensLimit }, 5).length).toBe(22244);
 });
 