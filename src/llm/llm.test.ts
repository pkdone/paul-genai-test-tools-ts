import llmConfig from "../config/llm.config";
import { ModelKey } from "../types/llm-models-types";
import { LLMModelMetadata, llmModelMetadataSchema, LLMPurpose } from "../types/llm-types";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";
import { z } from "zod";

// Simple test metadata for testing
const testMetadata = {
  [ModelKey.GPT_COMPLETIONS_GPT4]: {
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [ModelKey.GPT_COMPLETIONS_GPT4_32k]: {
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  }
};

describe("LLM Router", () => {
  describe("reducePromptSizeToTokenLimit", () => {
    test("reduces prompt size for small token limit", () => {
      const prompt = "1234 1234 1234 1234"; 
      const promptTokens = Math.floor(prompt.length / llmConfig.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      const tokensUsage = { promptTokens, completionTokens: 0, maxTotalTokens: 8 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata)).toBe("1234 1234 1234 1");
    });

    test("reduces prompt size for large completion tokens", () => {
      const prompt = "x".repeat(200); 
      const promptTokens = Math.floor(prompt.length / llmConfig.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      const tokensUsage = { promptTokens, completionTokens: 8192, maxTotalTokens: 8192 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata).length).toBe(99);
    });

    test("reduces prompt size for very large input", () => {
      const prompt = "x".repeat(2000000); 
      const promptTokens = Math.floor(prompt.length / llmConfig.MODEL_CHARS_PER_TOKEN_ESTIMATE);
      console.log(promptTokens);
      const tokensUsage = { promptTokens, completionTokens: 124, maxTotalTokens: 8192 }; // Using default GPT-4 limit
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata).length).toBe(22933);
    });

    test("handles empty prompt", () => {
      const prompt = "";
      const tokensUsage = { promptTokens: 0, completionTokens: 0, maxTotalTokens: 8 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata)).toBe("");
    });

    test("handles prompt with only whitespace", () => {
      const prompt = "   \n\t  ";
      const tokensUsage = { promptTokens: 1, completionTokens: 0, maxTotalTokens: 8 };
      const result = reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata);
      expect(result).toBe(prompt);
    });

    test("handles prompt with special characters", () => {
      const prompt = "!@#$%^&*()_+{}|:\"<>?~`-=[]\\;',./";
      const tokensUsage = { promptTokens: 10, completionTokens: 0, maxTotalTokens: 8 };
      expect(reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata).length).toBeLessThan(prompt.length);
    });

    test("handles prompt with emojis and unicode", () => {
      const prompt = "Hello 👋 World 🌍 with Unicode 你好";
      const tokensUsage = { promptTokens: 10, completionTokens: 0, maxTotalTokens: 8 };
      const result = reducePromptSizeToTokenLimit(prompt, ModelKey.GPT_COMPLETIONS_GPT4, tokensUsage, testMetadata);
      expect(result.length).toBeLessThan(prompt.length);
      expect(result).toContain("Hello");
    });
  });
});

describe("LLM Model Metadata Validation", () => {
  describe("Zod schema validation", () => {
    test("validates correct embeddings metadata", () => {
      const metadata: LLMModelMetadata = {
        urn: "dummy-model",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).not.toThrow();
    });

    test("validates correct completions metadata", () => {
      const metadata: LLMModelMetadata = {
        urn: "model-2",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).not.toThrow();
    });

    test("throws error when dimensions field is missing for embeddings", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when maxCompletionTokens field is missing for completions", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.COMPLETIONS,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when purpose field has invalid enum value", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: "INVALID_PURPOSE",
        dimensions: 1536,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when dimensions is negative", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: -1234,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when dimensions is zero", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.EMBEDDINGS, 
        dimensions: 0,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when maxCompletionTokens is negative", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: -1234,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when maxTotalTokens is negative", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: -1,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when modelId is missing", () => {
      const metadata = {
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when modelId is empty string", () => {
      const metadata = {
        modelId: "",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });

    test("throws error when maxCompletionTokens exceeds maxTotalTokens", () => {
      const metadata = {
        modelId: "dummy-model",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 10000,
        maxTotalTokens: 8191,
      };
      expect(() => llmModelMetadataSchema.parse(metadata)).toThrow(z.ZodError);
    });
  });
});
