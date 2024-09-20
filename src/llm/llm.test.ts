import LLMRouter from "./llm-router";
import { llmConst } from "../types/llm-constants";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";
import { llmModels, GPT_COMPLETIONS_MODEL_GPT4 } from "../types/llm-models";
const llmRouter = new LLMRouter(llmConst.OPENAI_GPT_MODELS, false);


test("LLMRouter reduce prompt size 1", () => {
  const prompt = "1234 1234 1234 1234"; 
  const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
  const tokensUage = { promptTokens, completionTokens: 0, maxTotalTokens: 8 };
  expect(reducePromptSizeToTokenLimit(prompt, GPT_COMPLETIONS_MODEL_GPT4, tokensUage)).toBe("1234 1234 1234 1");
});


test("LLMRouter reduce prompt size 2", () => {
  const prompt = "x".repeat(200); 
  const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
  const tokensUage = { promptTokens, completionTokens: 8192, maxTotalTokens: 8192 };
  expect(reducePromptSizeToTokenLimit(prompt, GPT_COMPLETIONS_MODEL_GPT4, tokensUage).length).toBe(150);
});


test("LLMRouter reduce prompt size 3", () => {
  const prompt = "x".repeat(2000000); 
  const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
  console.log(promptTokens);
  const tokensUage = { promptTokens, completionTokens: 124, maxTotalTokens: llmModels[GPT_COMPLETIONS_MODEL_GPT4].maxTotalTokens };
  expect(reducePromptSizeToTokenLimit(prompt, GPT_COMPLETIONS_MODEL_GPT4, tokensUage).length).toBe(22933);
 });
 