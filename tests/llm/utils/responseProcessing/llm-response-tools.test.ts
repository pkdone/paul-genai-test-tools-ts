import {
  LLMPurpose,
  LLMResponseStatus,
  LLMContext,
  LLMFunctionResponse,
  LLMResponseTokensUsage,
} from "../../../../src/llm/llm.types";
import {
  extractTokensAmountFromMetadataDefaultingMissingValues,
  postProcessAsJSONIfNeededGeneratingNewResult,
} from "../../../../src/llm/utils/responseProcessing/llm-response-tools";

const testMetadata = {
  GPT_COMPLETIONS_GPT4: {
    modelKey: "GPT_COMPLETIONS_GPT4",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  GPT_EMBEDDINGS_GPT4: {
    modelKey: "GPT_EMBEDDINGS_GPT4",
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
  },
};

describe("llm-response-tools", () => {
  describe("extractTokensAmountFromMetadataDefaultingMissingValues", () => {
    test("should return original values when all are positive", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      };

      const result = extractTokensAmountFromMetadataDefaultingMissingValues(
        "GPT_COMPLETIONS_GPT4",
        tokenUsage,
        testMetadata,
      );

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBe(8192);
    });

    test("should default negative completionTokens to 0", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: -1,
        maxTotalTokens: 8192,
      };

      const result = extractTokensAmountFromMetadataDefaultingMissingValues(
        "GPT_COMPLETIONS_GPT4",
        tokenUsage,
        testMetadata,
      );

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(0);
      expect(result.maxTotalTokens).toBe(8192);
    });

    test("should default negative maxTotalTokens to model metadata value", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: -1,
      };

      const result = extractTokensAmountFromMetadataDefaultingMissingValues(
        "GPT_COMPLETIONS_GPT4",
        tokenUsage,
        testMetadata,
      );

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBe(8192); // From testMetadata
    });

    test("should calculate promptTokens when negative", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: 50,
        maxTotalTokens: 8192,
      };

      const result = extractTokensAmountFromMetadataDefaultingMissingValues(
        "GPT_COMPLETIONS_GPT4",
        tokenUsage,
        testMetadata,
      );

      expect(result.promptTokens).toBe(8192 - 50 + 1); // maxTotalTokens - completionTokens + 1
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBe(8192);
    });

    test("should calculate promptTokens ensuring it's at least 1", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: 8192,
        maxTotalTokens: 8192,
      };

      const result = extractTokensAmountFromMetadataDefaultingMissingValues(
        "GPT_COMPLETIONS_GPT4",
        tokenUsage,
        testMetadata,
      );

      expect(result.promptTokens).toBe(1); // Math.max(1, 8192 - 8192 + 1) = Math.max(1, 1) = 1
      expect(result.completionTokens).toBe(8192);
      expect(result.maxTotalTokens).toBe(8192);
    });

    test("should handle all negative values", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: -5,
        maxTotalTokens: -10,
      };

      const result = extractTokensAmountFromMetadataDefaultingMissingValues(
        "GPT_COMPLETIONS_GPT4",
        tokenUsage,
        testMetadata,
      );

      expect(result.promptTokens).toBe(8192 - 0 + 1); // maxTotalTokens - completionTokens + 1
      expect(result.completionTokens).toBe(0);
      expect(result.maxTotalTokens).toBe(8192);
    });
  });



  describe("postProcessAsJSONIfNeededGeneratingNewResult", () => {
    const skeletonResult: LLMFunctionResponse = {
      status: LLMResponseStatus.UNKNOWN,
      request: "test request",
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: {},
      tokensUage: { promptTokens: 100, completionTokens: 50, maxTotalTokens: 8192 },
    };

    test("should return COMPLETED status for COMPLETIONS with string content and asJson=false", () => {
      const responseContent = "This is a plain text response";
      const context: LLMContext = {};

      const result = postProcessAsJSONIfNeededGeneratingNewResult(
        skeletonResult,
        "GPT_COMPLETIONS_GPT4",
        LLMPurpose.COMPLETIONS,
        responseContent,
        false,
        context,
        testMetadata,
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBe(responseContent);
    });

    test("should return COMPLETED status for COMPLETIONS with valid JSON content and asJson=true", () => {
      const responseContent = '{"key": "value", "number": 42}';
      const context: LLMContext = {};

      const result = postProcessAsJSONIfNeededGeneratingNewResult(
        skeletonResult,
        "GPT_COMPLETIONS_GPT4",
        LLMPurpose.COMPLETIONS,
        responseContent,
        true,
        context,
        testMetadata,
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toEqual({ key: "value", number: 42 });
    });

    test("should return OVERLOADED status for COMPLETIONS with invalid JSON content and asJson=true", () => {
      const responseContent = "This is not valid JSON {";
      const context: LLMContext = {};

      const result = postProcessAsJSONIfNeededGeneratingNewResult(
        skeletonResult,
        "GPT_COMPLETIONS_GPT4",
        LLMPurpose.COMPLETIONS,
        responseContent,
        true,
        context,
        testMetadata,
      );

      expect(result.status).toBe(LLMResponseStatus.OVERLOADED);
      expect(result.generated).toBeUndefined();
      expect(context.jsonParseError).toBeDefined();
    });

    test("should return COMPLETED status for non-COMPLETIONS task type", () => {
      const responseContent = [0.1, 0.2, 0.3]; // Embedding vector
      const context: LLMContext = {};

      const result = postProcessAsJSONIfNeededGeneratingNewResult(
        skeletonResult,
        "GPT_EMBEDDINGS_GPT4",
        LLMPurpose.EMBEDDINGS,
        responseContent,
        false,
        context,
        testMetadata,
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toEqual(responseContent);
    });
  });
});
