import { 
  LLMPurpose, 
  ResolvedLLMModelMetadata, 
  LLMModelKeysSet, 
  LLMErrorMsgRegExPattern,
  LLMResponseTokensUsage,
} from "../../../src/llm/llm.types";
import { 
  LLMImplSpecificResponseSummary, 
  LLMProviderSpecificConfig 
} from "../../../src/llm/providers/llm-provider.types";
import AbstractLLM from "../../../src/llm/core/abstract-llm";
import { AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT } from "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";

// Test-only constants
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
const GPT_EMBEDDINGS_GPT4 = "GPT_EMBEDDINGS_GPT4";

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
  [GPT_EMBEDDINGS_GPT4]: {
    modelKey: GPT_EMBEDDINGS_GPT4,
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Test concrete class that extends AbstractLLM to test protected methods
class TestLLM extends AbstractLLM {
  constructor() {
    const modelsKeys: LLMModelKeysSet = {
      embeddingsModelKey: GPT_EMBEDDINGS_GPT4,
      primaryCompletionModelKey: GPT_COMPLETIONS_GPT4_32k,
    };
    const errorPatterns: LLMErrorMsgRegExPattern[] = [];
    const providerConfig: LLMProviderSpecificConfig = {};
    
    super(modelsKeys, testModelsMetadata, errorPatterns, providerConfig);
  }

  // Expose protected methods for testing
  testExtractTokensAmountFromMetadataDefaultingMissingValues(
    modelKey: string,
    tokenUsage: LLMResponseTokensUsage,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  ): LLMResponseTokensUsage {
    return this.extractTokensAmountFromMetadataDefaultingMissingValues(modelKey, tokenUsage, modelsMetadata);
  }

  getModelFamily(): string {
    return "test";
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async invokeImplementationSpecificLLM(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: "test response",
      tokenUsage: { promptTokens: 10, completionTokens: 20, maxTotalTokens: 100 },
    };
  }

  protected isLLMOverloaded(): boolean {
    return false;
  }

  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

describe("Abstract LLM Token Extraction", () => {
  let testLLM: TestLLM;

  beforeEach(() => {
    testLLM = new TestLLM();
  });

  describe("Token extraction from metadata", () => {
    test("extracts tokens with missing maxTotalTokens", () => {
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: -1,
      };
      expect(
        testLLM.testExtractTokensAmountFromMetadataDefaultingMissingValues(
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
        testLLM.testExtractTokensAmountFromMetadataDefaultingMissingValues(
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
        testLLM.testExtractTokensAmountFromMetadataDefaultingMissingValues(
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
        testLLM.testExtractTokensAmountFromMetadataDefaultingMissingValues(
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
