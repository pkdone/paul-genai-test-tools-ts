import { llmConst } from "../types/llm-constants";
import { ModelKey } from "../types/llm-models-metadata";
import { JSONLLMModelMetadata } from "../types/llm-types";
import { LLMMetadataError } from "../types/llm-errors";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";
import { llmModelsMetadataLoaderSrvc, LLMModelsMetadataLoader } from "./llm-configurator/llm-models-metadata-loader";

describe("LLM Router", () => {
  describe("reducePromptSizeToTokenLimit", () => {
    test("reduces prompt size for small token limit", () => {
      const prompt = "1234 1234 1234 1234"; 
      const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      const tokensUage = { promptTokens, completionTokens: 0, maxTotalTokens: 8 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage)).toBe("1234 1234 1234 1");
    });

    test("reduces prompt size for large completion tokens", () => {
      const prompt = "x".repeat(200); 
      const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      const tokensUage = { promptTokens, completionTokens: 8192, maxTotalTokens: 8192 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage).length).toBe(150);
    });

    test("reduces prompt size for very large input", () => {
      const llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
      const prompt = "x".repeat(2000000); 
      const promptTokens = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      console.log(promptTokens);
      const tokensUage = { promptTokens, completionTokens: 124, maxTotalTokens: llmModelsMetadata[ModelKey.GPT_COMPLETIONS_GPT4].maxTotalTokens };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage).length).toBe(22933);
    });

    test("handles empty prompt", () => {
      const prompt = "";
      const tokensUage = { promptTokens: 0, completionTokens: 0, maxTotalTokens: 8 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage)).toBe("");
    });

    test("handles prompt with only whitespace", () => {
      const prompt = "   \n\t  ";
      const tokensUage = { promptTokens: 1, completionTokens: 0, maxTotalTokens: 8 };
      const result = reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage);
      expect(result).toBe(prompt);
    });

    test("handles prompt with special characters", () => {
      const prompt = "!@#$%^&*()_+{}|:\"<>?~`-=[]\\;',./";
      const tokensUage = { promptTokens: 10, completionTokens: 0, maxTotalTokens: 8 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage).length).toBeLessThan(prompt.length);
    });

    test("handles prompt with emojis and unicode", () => {
      const prompt = "Hello 👋 World 🌍 with Unicode 你好";
      const tokensUage = { promptTokens: 10, completionTokens: 0, maxTotalTokens: 8 };
      const result = reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUage);
      expect(result.length).toBeLessThan(prompt.length);
      expect(result).toContain("Hello");
    });
  });
});

describe("LLM Models Loader", () => {
  describe("metadata validation", () => {
    test("validates correct metadata", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "embeddings",
          dimensions: 1536,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect((new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toStrictEqual(dummyModels);
    });

    test("validates multiple models", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        MODEL_1: {
          modelId: "model-1",
          purpose: "embeddings",
          dimensions: 1536,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        },
        MODEL_2: {
          modelId: "model-2",
          purpose: "completions",
          maxCompletionTokens: 4096,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect((new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toStrictEqual(dummyModels);
    });

    test("throws error when dimensions field is missing", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "embeddings",
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when maxCompletionTokens field is missing", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "completions",
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when purpose field has invalid enum value", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "XXXXXXXXXXXXXXXXXXX",
          dimensions: 1536,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when dimensions is negative", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "embeddings",
          dimensions: -1234,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when dimensions is zero", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "embeddings",
          dimensions: 0,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when maxCompletionTokens is negative", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "completions",
          maxCompletionTokens: -1234,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when maxTotalTokens is negative", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "embeddings",
          dimensions: 1536,
          maxTotalTokens: -1,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when apiFamily field has invalid enum value", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "another-dummy-model",
          purpose: "embeddings",
          dimensions: 1536,
          maxTotalTokens: 8191,
          apiFamily: "XXXXXXXXXXXXXXXXXXX",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when modelId is missing", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          purpose: "embeddings",
          dimensions: 1536,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when modelId is empty string", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "",
          purpose: "embeddings",
          dimensions: 1536,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });

    test("throws error when maxCompletionTokens exceeds maxTotalTokens", () => {
      const dummyModels: Readonly<Record<string, JSONLLMModelMetadata>> = {
        A_DUMMY_MODEL: {
          modelId: "dummy-model",
          purpose: "completions",
          maxCompletionTokens: 10000,
          maxTotalTokens: 8191,
          apiFamily: "OpenAI",
        }
      } as const;
      expect(() => (new LLMModelsMetadataLoader(dummyModels)).getModelsMetadata()).toThrow(LLMMetadataError);
    });
  });
});
