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
    // Test data for mock model creation
    const mockModelsTestData = [
      {
        description: "embeddings model with purpose check",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191
        },
        property: "purpose",
        expectedValue: LLMPurpose.EMBEDDINGS
      },
      {
        description: "completion model with purpose check",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192
        },
        property: "purpose",
        expectedValue: LLMPurpose.COMPLETIONS
      },
      {
        description: "embeddings model with dimensions check",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191
        },
        property: "dimensions",
        expectedValue: 1536
      },
      {
        description: "completion model with maxCompletionTokens check",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192
        },
        property: "maxCompletionTokens",
        expectedValue: 4096
      },
      {
        description: "embeddings model with maxTotalTokens check",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191
        },
        property: "maxTotalTokens",
        expectedValue: 8191
      },
      {
        description: "embeddings model with urn check",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191
        },
        property: "urn",
        expectedValue: "text-embedding-ada-002"
      },
      {
        description: "embeddings model with internalKey check",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191
        },
        property: "internalKey",
        expectedValue: "GPT_EMBEDDINGS_ADA002"
      },
      {
        description: "completion model with maxTotalTokens check",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192
        },
        property: "maxTotalTokens",
        expectedValue: 8192
      }
    ];

    test.each(mockModelsTestData)(
      "create mock $description",
      ({ model, property, expectedValue }) => {
        const mockModel: LLMModelMetadata = model;
        expect(mockModel[property as keyof LLMModelMetadata]).toBe(expectedValue);
      }
    );
  });

  describe("Validate LLM metadata schemas", () => {
    // Test data for schema validation
    const validModelsTestData = [
      {
        description: "valid embeddings model",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191
        },
        shouldPass: true
      },
      {
        description: "valid completions model",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192
        },
        shouldPass: true
      }
    ];

    const invalidModelsTestData = [
      {
        description: "embeddings model without dimensions",
        model: {
          internalKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8191
        },
        shouldPass: false
      },
      {
        description: "completions model without maxCompletionTokens",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxTotalTokens: 8192
        },
        shouldPass: false
      },
      {
        description: "model with maxCompletionTokens > maxTotalTokens",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 10000,
          maxTotalTokens: 8192
        },
        shouldPass: false
      },
      {
        description: "model with empty urn",
        model: {
          internalKey: "GPT_COMPLETIONS_GPT4",
          urn: "",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192
        },
        shouldPass: false
      }
    ];

    test.each(validModelsTestData)(
      "$description passes validation",
      ({ model }) => {
        expect(() => llmModelMetadataSchema.parse(model)).not.toThrow();
      }
    );

    test.each(invalidModelsTestData)(
      "$description fails validation",
      ({ model }) => {
        expect(() => llmModelMetadataSchema.parse(model)).toThrow();
      }
    );
  });
});
