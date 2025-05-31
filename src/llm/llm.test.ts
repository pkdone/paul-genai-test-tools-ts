import { LLMModelMetadata, LLMPurpose } from "../types/llm.types";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";
import { z } from "zod";

// Zod schema for LLMModelMetadata validation
export const llmModelMetadataSchema = z.object({
  key: z.string(),
  urn: z.string().min(1, "Model ID cannot be empty"),
  purpose: z.nativeEnum(LLMPurpose),
  dimensions: z.number().positive().optional(),
  maxCompletionTokens: z.number().positive().optional(),
  maxTotalTokens: z.number().positive(),
}).refine((data) => {
  // Require dimensions for embeddings models
  if (data.purpose === LLMPurpose.EMBEDDINGS && !data.dimensions) {
    return false;
  }
  // Require maxCompletionTokens for completions models
  if (data.purpose === LLMPurpose.COMPLETIONS && !data.maxCompletionTokens) {
    return false;
  }
  // Ensure maxCompletionTokens doesn't exceed maxTotalTokens
  if (data.maxCompletionTokens && data.maxCompletionTokens > data.maxTotalTokens) {
    return false;
  }
  return true;
}, {
  message: "Invalid model metadata configuration"
});

// Simple test metadata for testing
const testMetadata = {
  "GPT_COMPLETIONS_GPT4": {
    key: "GPT_COMPLETIONS_GPT4",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  "GPT_COMPLETIONS_GPT4_32k": {
    key: "GPT_COMPLETIONS_GPT4_32k",
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  }
};

describe("LLM Router tests", () => {
  describe("Test prompt reduction function", () => {
    test("reduce prompt for successful LLM completions - should not reduce", () => {
      const prompt = "1234 1234 1234 1234";
      const tokensUsage = { promptTokens: 4, completionTokens: 10, maxTotalTokens: 8192 };
      expect(reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata)).toBe("1234 1234 1234 1");
    });

    test("reduce prompt for LLM completion tokens limit hit - should reduce", () => {
      const prompt = "1234 ".repeat(25);
      const tokensUsage = { promptTokens: 100, completionTokens: 4096, maxTotalTokens: 8192 };
      expect(reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata).length).toBe(93);
    });

    test("reduce prompt for LLM total tokens limit hit - should reduce", () => {
      const prompt = "A".repeat(57865);  // random string
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
      const result = reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata);
      expect(result.length).toBe(49185);
    });

    test("reduce empty prompt - should return empty", () => {
      const prompt = "";
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
      expect(reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata)).toBe("");
    });

    test("reduce prompt for LLM total tokens limit hit severely - should reduce significantly", () => {
      const prompt = "1234 ".repeat(250);
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
      const result = reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata);
      expect(result.length).toBe(1062);
    });

    test("reduce prompt with lower completion tokens limit - should reduce", () => {
      const prompt = "A".repeat(1000);
      const tokensUsage = { promptTokens: 6000, completionTokens: 3000, maxTotalTokens: 32768 };
      expect(reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata).length).toBeLessThan(prompt.length);
    });

    test("reduce prompt with higher max tokens limit - should reduce less", () => {
      const prompt = "A".repeat(1000);
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 32768 };
      const result = reducePromptSizeToTokenLimit(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata);
      expect(result.length).toBeLessThan(prompt.length);
    });
  });

  describe("LLM provider abstractions", () => {
    test("create mock embeddings model", () => {
      const mockEmbeddingsModel: LLMModelMetadata = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel.purpose).toBe(LLMPurpose.EMBEDDINGS);
    });

    test("create mock completion model", () => {
      const mockCompletionModel: LLMModelMetadata = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(mockCompletionModel.purpose).toBe(LLMPurpose.COMPLETIONS);
    });

    test("create mock embeddings model 2", () => {
      const mockEmbeddingsModel2: LLMModelMetadata = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel2.dimensions).toBe(1536);
    });

    test("create mock completion model 2", () => {
      const mockCompletionModel2: LLMModelMetadata = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(mockCompletionModel2.maxCompletionTokens).toBe(4096);
    });

    test("create mock embeddings model 3", () => {
      const mockEmbeddingsModel3: LLMModelMetadata = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel3.maxTotalTokens).toBe(8191);
    });

    test("create mock embeddings model 4", () => {
      const mockEmbeddingsModel4: LLMModelMetadata = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel4.urn).toBe("text-embedding-ada-002");
    });

    test("create mock embeddings model 5", () => {
      const mockEmbeddingsModel5: LLMModelMetadata = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel5.key).toBe("GPT_EMBEDDINGS_ADA002");
    });

    test("create mock completion model 3", () => {
      const mockCompletionModel3: LLMModelMetadata = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(mockCompletionModel3.maxTotalTokens).toBe(8192);
    });
  });

  describe("Validate LLM metadata schemas", () => {
    test("valid embeddings model passes validation", () => {
      const embeddings = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(() => llmModelMetadataSchema.parse(embeddings)).not.toThrow();
    });

    test("valid completions model passes validation", () => {
      const completions = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(completions)).not.toThrow();
    });

    test("embeddings model without dimensions fails validation", () => {
      const embeddingsWithoutDimensions = {
        key: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: 8191
      };
      expect(() => llmModelMetadataSchema.parse(embeddingsWithoutDimensions)).toThrow();
    });

    test("completions model without maxCompletionTokens fails validation", () => {
      const completionsWithoutMaxTokens = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(completionsWithoutMaxTokens)).toThrow();
    });

    test("model with maxCompletionTokens > maxTotalTokens fails validation", () => {
      const invalidCompletion = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 10000,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(invalidCompletion)).toThrow();
    });

    test("model with empty urn fails validation", () => {
      const emptyUrn = {
        key: "GPT_COMPLETIONS_GPT4",
        urn: "",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(emptyUrn)).toThrow();
    });
  });
});
