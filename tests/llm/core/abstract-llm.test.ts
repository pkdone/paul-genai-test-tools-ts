import { LLMPurpose, ResolvedLLMModelMetadata } from "../../../src/llm/llm.types";
import { extractTokensAmountFromMetadataDefaultingMissingValues } from "../../../src/llm/processing/msgProcessing/llm-response-tools";
import { AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT } from "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";

// Test-only constants
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";

// Test models metadata for generic token extraction tests
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
};

describe("Abstract LLM Token Extraction", () => {
  describe("Token extraction from metadata", () => {
    test("extracts tokens with missing maxTotalTokens", () => {
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: -1,
      };
      expect(
        extractTokensAmountFromMetadataDefaultingMissingValues(
          "GPT_COMPLETIONS_GPT4_32k",
          tokenUsage,
          testModelsMetadata,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 200,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens with missing completionTokens", () => {
      const tokenUsage = {
        promptTokens: 32760,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      expect(
        extractTokensAmountFromMetadataDefaultingMissingValues(
          "GPT_COMPLETIONS_GPT4_32k",
          tokenUsage,
          testModelsMetadata,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 32760,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens with missing promptTokens", () => {
      const tokenUsage = {
        promptTokens: -1,
        completionTokens: 200,
        maxTotalTokens: -1,
      };
      expect(
        extractTokensAmountFromMetadataDefaultingMissingValues(
          "GPT_COMPLETIONS_GPT4_32k",
          tokenUsage,
          testModelsMetadata,
        ),
      ).toStrictEqual({
        completionTokens: 200,
        promptTokens: 32569,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens for different model", () => {
      const tokenUsage = {
        promptTokens: 243,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      expect(
        extractTokensAmountFromMetadataDefaultingMissingValues(
          "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT",
          tokenUsage,
          testModelsMetadata,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 243,
        maxTotalTokens: 128000,
      });
    });
  });
});
