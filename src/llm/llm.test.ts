// filepath: /home/pdone/Projects/paul-genai-test-tools-ts/src/llm/llm.test.ts
import { LLMModelMetadata, LLMPurpose } from "../types/llm.types";
import { z } from "zod";

// Zod schema for LLMModelMetadata validation
const llmModelMetadataSchema = z.object({
  internalKey: z.string(),
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

describe("LLM Router tests", () => {
  describe("LLM provider abstractions", () => {
    test("create mock embeddings model", () => {
      const mockEmbeddingsModel: LLMModelMetadata = {
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel.purpose).toBe(LLMPurpose.EMBEDDINGS);
    });

    test("create mock completion model", () => {
      const mockCompletionModel: LLMModelMetadata = {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(mockCompletionModel.purpose).toBe(LLMPurpose.COMPLETIONS);
    });

    test("create mock embeddings model 2", () => {
      const mockEmbeddingsModel2: LLMModelMetadata = {
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel2.dimensions).toBe(1536);
    });

    test("create mock completion model 2", () => {
      const mockCompletionModel2: LLMModelMetadata = {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(mockCompletionModel2.maxCompletionTokens).toBe(4096);
    });

    test("create mock embeddings model 3", () => {
      const mockEmbeddingsModel3: LLMModelMetadata = {
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel3.maxTotalTokens).toBe(8191);
    });

    test("create mock embeddings model 4", () => {
      const mockEmbeddingsModel4: LLMModelMetadata = {
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel4.urn).toBe("text-embedding-ada-002");
    });

    test("create mock embeddings model 5", () => {
      const mockEmbeddingsModel5: LLMModelMetadata = {
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(mockEmbeddingsModel5.internalKey).toBe("GPT_EMBEDDINGS_ADA002");
    });

    test("create mock completion model 3", () => {
      const mockCompletionModel3: LLMModelMetadata = {
        internalKey: "GPT_COMPLETIONS_GPT4",
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
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191
      };
      expect(() => llmModelMetadataSchema.parse(embeddings)).not.toThrow();
    });

    test("valid completions model passes validation", () => {
      const completions = {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(completions)).not.toThrow();
    });

    test("embeddings model without dimensions fails validation", () => {
      const embeddingsWithoutDimensions = {
        internalKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: 8191
      };
      expect(() => llmModelMetadataSchema.parse(embeddingsWithoutDimensions)).toThrow();
    });

    test("completions model without maxCompletionTokens fails validation", () => {
      const completionsWithoutMaxTokens = {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(completionsWithoutMaxTokens)).toThrow();
    });

    test("model with maxCompletionTokens > maxTotalTokens fails validation", () => {
      const invalidCompletion = {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 10000,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(invalidCompletion)).toThrow();
    });

    test("model with empty urn fails validation", () => {
      const emptyUrn = {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      };
      expect(() => llmModelMetadataSchema.parse(emptyUrn)).toThrow();
    });
  });
});
