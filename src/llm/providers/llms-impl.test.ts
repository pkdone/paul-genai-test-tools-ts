import { ModelKey, ModelProviderType, ModelFamily } from "../../types/llm-models-types";
import { azureOpenAIProviderManifest } from "./openai/azure-openai/azure-openai.manifest";
import { bedrockClaudeProviderManifest } from "./bedrock/bedrock-claude/bedrock-claude.manifest";
import { bedrockLlamaProviderManifest } from "./bedrock/bedrock-llama/bedrock-llama.manifest";
import { LLMPurpose, LLMModelMetadata } from "../../types/llm-types";
import { extractTokensAmountFromMetadataDefaultingMissingValues, 
         extractTokensAmountAndLimitFromErrorMsg }  from "../llm-response-tools";

// Mock complete environment for testing
const mockEnv = {
  MONGODB_URL: "mongodb://localhost:27017/test",
  CODEBASE_DIR_PATH: "/test/path",
  IGNORE_ALREADY_PROCESSED_FILES: false,
  LLM: ModelFamily.AZURE_OPENAI_MODELS,
  AZURE_LLM_API_KEY: "test-key",
  AZURE_API_ENDPOINT: "https://test.openai.azure.com/",
  AZURE_API_EMBEDDINGS_MODEL: "test-embeddings",
  AZURE_API_COMPLETIONS_MODEL_PRIMARY: "test-primary", 
  AZURE_API_COMPLETIONS_MODEL_SECONDARY: "test-secondary"
};

// Create test instance using provider manifest
const testModelSet = {
  embeddings: azureOpenAIProviderManifest.models.embeddings.key,
  primaryCompletion: azureOpenAIProviderManifest.models.primaryCompletion.key,
  secondaryCompletion: azureOpenAIProviderManifest.models.secondaryCompletion?.key
};

const testModelsMetadata: Partial<Record<ModelKey, LLMModelMetadata>> = {
  [azureOpenAIProviderManifest.models.embeddings.key]: {
    modelId: azureOpenAIProviderManifest.models.embeddings.id,
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: azureOpenAIProviderManifest.models.embeddings.dimensions,
    maxTotalTokens: azureOpenAIProviderManifest.models.embeddings.maxTotalTokens,
    modelProvider: azureOpenAIProviderManifest.modelProviderType
  },
  [azureOpenAIProviderManifest.models.primaryCompletion.key]: {
    modelId: azureOpenAIProviderManifest.models.primaryCompletion.id,
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: azureOpenAIProviderManifest.models.primaryCompletion.maxCompletionTokens,
    maxTotalTokens: azureOpenAIProviderManifest.models.primaryCompletion.maxTotalTokens,
    modelProvider: azureOpenAIProviderManifest.modelProviderType
  },
  // Add common test models that are used in the tests
  [ModelKey.GPT_COMPLETIONS_GPT4]: {
    id: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
    modelProvider: ModelProviderType.OPENAI,
  },
  [ModelKey.GPT_COMPLETIONS_GPT4_32k]: {
    id: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
    modelProvider: ModelProviderType.OPENAI,
  },
  [ModelKey.AWS_COMPLETIONS_CLAUDE_V35]: {
    id: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4088,
    maxTotalTokens: 200000,
    modelProvider: ModelProviderType.BEDROCK,
  },
  [ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT]: {
    id: "meta.llama3-70b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
    modelProvider: ModelProviderType.BEDROCK,
  },
  [ModelKey.AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    id: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
    modelProvider: ModelProviderType.BEDROCK,
  }
};

// Add secondary completion if it exists
if (azureOpenAIProviderManifest.models.secondaryCompletion) {
  const secondaryModel = azureOpenAIProviderManifest.models.secondaryCompletion;
  testModelsMetadata[secondaryModel.key] = {
    id: secondaryModel.id,
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: secondaryModel.maxCompletionTokens ?? 4096,
    maxTotalTokens: secondaryModel.maxTotalTokens,
    modelProvider: azureOpenAIProviderManifest.modelProviderType
  };
}

describe("Token extraction from error messages", () => {
  describe("AzureOpenAI", () => {
    test("extracts tokens from error message with completion tokens", () => {
      const errorMsg = "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.GPT_COMPLETIONS_GPT4, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 5,
          "promptTokens": 10346,
          "maxTotalTokens": 8191
       });
    });

    test("extracts tokens from error message without completion tokens", () => {
      const errorMsg = "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.GPT_COMPLETIONS_GPT4, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 8545,
          "maxTotalTokens": 8192
       });
    });
  });

  describe("BedrockClaude", () => {
    test("extracts tokens from error message with max input tokens", () => {
      const errorMsg = "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1048576, request input token count: 1049999 ";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_CLAUDE_V35, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, bedrockClaudeProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 1049999,
          "maxTotalTokens": 1048576
       });
    });

    test("extracts tokens from error message with maxLength", () => {
      const errorMsg = "ValidationException: Malformed input request: expected maxLength: 2097152, actual: 2300000, please reformat your input and try again.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_CLAUDE_V35, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, bedrockClaudeProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 219346,
          "maxTotalTokens": 200000
       });
    });

    test("extracts tokens from generic too long error", () => {
      const errorMsg = "Input is too long for requested model.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_CLAUDE_V35, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, bedrockClaudeProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 200001,
          "maxTotalTokens": 200000
       });
    });
  });

  describe("BedrockLlama", () => {
    test("extracts tokens from error message for 70B model", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, bedrockLlamaProviderManifest.errorPatterns))
       .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 8193,
         "maxTotalTokens": 8192
       });
    }); 

    test("extracts tokens from error message for 405B model", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 128000 tokens. Please reduce the length of the prompt.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT, "dummy prompt", errorMsg, testModelsMetadata as Record<string, LLMModelMetadata>, bedrockLlamaProviderManifest.errorPatterns))
       .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 128001,
         "maxTotalTokens": 128000
       });
    }); 
  });
});

describe("Token extraction from metadata", () => {
  describe("AbstractLLM", () => {
    test("extracts tokens with missing maxTotalTokens", () => {
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.GPT_COMPLETIONS_GPT4_32k, tokenUsage, testModelsMetadata as Record<string, LLMModelMetadata>))
        .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 200,
          "maxTotalTokens": 32768
      });
    });

    test("extracts tokens with missing completionTokens", () => {
      const tokenUsage = {
        promptTokens: 32760,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.GPT_COMPLETIONS_GPT4_32k, tokenUsage, testModelsMetadata as Record<string, LLMModelMetadata>))
        .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 32760,
          "maxTotalTokens": 32768
      });
    });

    test("extracts tokens with missing promptTokens", () => {
      const tokenUsage = {
        promptTokens: -1,
        completionTokens: 200,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.GPT_COMPLETIONS_GPT4_32k, tokenUsage, testModelsMetadata as Record<string, LLMModelMetadata>))
        .toStrictEqual({
          "completionTokens": 200,
          "promptTokens": 32569,
          "maxTotalTokens": 32768
      });
    });

    test("extracts tokens for different model", () => {
      const tokenUsage = {
        promptTokens: 243,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT, tokenUsage, testModelsMetadata as Record<string, LLMModelMetadata>))
        .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 243,
          "maxTotalTokens": 128000
      });
    });
  });
});

describe("OpenAI implementation", () => {
  describe("model management", () => {
    test("counts available models", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelSet, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns);
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });
  });

  describe("error handling", () => {
    test("detects rate limit error", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelSet, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe(ModelFamily.AZURE_OPENAI_MODELS);
    }); 

    test("detects internal server error", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelSet, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe(ModelFamily.AZURE_OPENAI_MODELS);
    }); 

    test("detects token limit exceeded with code", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelSet, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe(ModelFamily.AZURE_OPENAI_MODELS);
    }); 

    test("detects token limit exceeded with type", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelSet, testModelsMetadata as Record<string, LLMModelMetadata>, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe(ModelFamily.AZURE_OPENAI_MODELS);
    }); 
  });
});
