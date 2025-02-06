import { llmConst, llmModels } from "../types/llm-constants";
import { ModelKey, JSONLLMModelMetadata } from "../types/llm-types";
import { LLMMetadataError } from "../types/llm-errors";
import { assembleLLMModelMetadataFromJSON } from "./llm-metadata-initializer";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";

test("LLMRouter reduce prompt size 1", () => {
  const prompt = "1234 1234 1234 1234"; 
  const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
  const tokensUage = { promptTokens, completionTokens: 0, maxTotalTokens: 8 };
  expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage)).toBe("1234 1234 1234 1");
});

test("LLMRouter reduce prompt size 2", () => {
  const prompt = "x".repeat(200); 
  const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
  const tokensUage = { promptTokens, completionTokens: 8192, maxTotalTokens: 8192 };
  expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage).length).toBe(150);
});

test("LLMRouter reduce prompt size 3", () => {
  const prompt = "x".repeat(2000000); 
  const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
  console.log(promptTokens);
  const tokensUage = { promptTokens, completionTokens: 124, maxTotalTokens: llmModels[ModelKey.GPT_COMPLETIONS_GPT4].maxTotalTokens };
  expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage).length).toBe(22933);
});

test("LLM metadata positive check", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "embeddings",
      maxDimensions: 1536,
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(assembleLLMModelMetadataFromJSON(dummyModels)).toStrictEqual(dummyModels);
});

test("LLM metadata negative check - maxDimensions field missing", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "embeddings",
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - maxCompletionTokens field missing", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "completions",
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - purpose field bad enum", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "XXXXXXXXXXXXXXXXXXX",
      maxDimensions: 1536,
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - maxDimensions is not positive num - minus", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "embeddings",
      maxDimensions: -1234,
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - maxDimensions is not positive num - zero", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "embeddings",
      maxDimensions: 0,
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - maxCompletionTokens is not positive num", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "completions",
      maxCompletionTokens: -1234,
      maxTotalTokens: 8191,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - maxTotalTokens is not positive num", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "dummy-model",
      purpose: "embeddings",
      maxDimensions: 1536,
      maxTotalTokens: -1,
      apiFamily: "OpenAI",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});

test("LLM metadata negative check - apiFamily field bad enum", () => {
  const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
    A_DUMMY_MODEL: {
      modelId: "another-dummy-model",
      purpose: "embeddings",
      maxDimensions: 1536,
      maxTotalTokens: 8191,
      apiFamily: "XXXXXXXXXXXXXXXXXXX",
    }
  };
  expect(() => assembleLLMModelMetadataFromJSON(dummyModels)).toThrow(LLMMetadataError);
});
