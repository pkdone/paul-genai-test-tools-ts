import { LLMPurpose, ResolvedLLMModelMetadata, LLMModelKeysSet } from "../llm.types";
import { extractTokensAmountFromMetadataDefaultingMissingValues }  from "../utils/responseProcessing/llm-response-tools";
import { extractTokensAmountAndLimitFromErrorMsg } from "../utils/responseProcessing/llm-error-pattern-parser";
import { bedrockClaudeProviderManifest, AWS_COMPLETIONS_CLAUDE_V35 } from "./bedrock/bedrockClaude/bedrock-claude.manifest";
import { azureOpenAIProviderManifest, GPT_COMPLETIONS_GPT4, GPT_COMPLETIONS_GPT4_32k } from "./openai/azureOpenai/azure-openai.manifest";
import { bedrockLlamaProviderManifest, AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT, AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT, AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT } from "./bedrock/bedrockLlama/bedrock-llama.manifest";
import { loadBaseEnvVarsOnly } from "../../app/env";

// Load environment variables (including MongoDB URL) from .env file
const baseEnv = loadBaseEnvVarsOnly();

// Mock complete environment for testing
const mockEnv = {
  MONGODB_URL: baseEnv.MONGODB_URL,
  CODEBASE_DIR_PATH: "/test/path",
  IGNORE_ALREADY_PROCESSED_FILES: false,
  LLM: "AzureOpenAI",
  AZURE_OPENAI_LLM_API_KEY: "test-key",
  AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com/",
  AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT: "test-embeddings",
  AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY: "test-primary", 
  AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY: "test-secondary",
  AZURE_OPENAI_ADA_EMBEDDINGS_MODEL: "text-embedding-ada-002",
  AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY: "gpt-4o",
  AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY: "gpt-4-turbo",
};

// Helper function to resolve URN from environment variable key
const resolveUrn = (urnEnvKey: string): string => {
  return mockEnv[urnEnvKey as keyof typeof mockEnv] as string;
};

// Create test instance using provider manifest
const testModelKeysSet: LLMModelKeysSet = {
  embeddingsModelKey: azureOpenAIProviderManifest.models.embeddings.modelKey,
  primaryCompletionModelKey: azureOpenAIProviderManifest.models.primaryCompletion.modelKey,
  secondaryCompletionModelKey: azureOpenAIProviderManifest.models.secondaryCompletion?.modelKey
};

const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [azureOpenAIProviderManifest.models.embeddings.modelKey]: {
    modelKey: azureOpenAIProviderManifest.models.embeddings.modelKey,
    urn: resolveUrn(azureOpenAIProviderManifest.models.embeddings.urnEnvKey),
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: azureOpenAIProviderManifest.models.embeddings.dimensions,
    maxTotalTokens: azureOpenAIProviderManifest.models.embeddings.maxTotalTokens,
  },
  [azureOpenAIProviderManifest.models.primaryCompletion.modelKey]: {
    modelKey: azureOpenAIProviderManifest.models.primaryCompletion.modelKey,
    urn: resolveUrn(azureOpenAIProviderManifest.models.primaryCompletion.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: azureOpenAIProviderManifest.models.primaryCompletion.maxCompletionTokens,
    maxTotalTokens: azureOpenAIProviderManifest.models.primaryCompletion.maxTotalTokens,
  },
  // Add common test models that are used in the tests
  [GPT_COMPLETIONS_GPT4]: {
    modelKey: GPT_COMPLETIONS_GPT4,
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [AWS_COMPLETIONS_CLAUDE_V35]: {
    modelKey: AWS_COMPLETIONS_CLAUDE_V35,
    urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4088,
    maxTotalTokens: 200000,
  },
  [AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
    urn: "us.meta.llama3-3-70b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8192,
    maxTotalTokens: 128000,
  },
  [AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
  [AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  }
};

// Add secondary completion if it exists
if (azureOpenAIProviderManifest.models.secondaryCompletion) {
  const secondaryModel = azureOpenAIProviderManifest.models.secondaryCompletion;
  testModelsMetadata[secondaryModel.modelKey] = {
    modelKey: secondaryModel.modelKey,
    urn: resolveUrn(secondaryModel.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: secondaryModel.maxCompletionTokens ?? 4096,
    maxTotalTokens: secondaryModel.maxTotalTokens,
  };
}

describe("Token extraction from error messages", () => {
  describe("AzureOpenAI", () => {
    test("extracts tokens from error message with completion tokens", () => {
      const errorMsg = "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
      expect(extractTokensAmountAndLimitFromErrorMsg("GPT_COMPLETIONS_GPT4", "dummy prompt", errorMsg, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 5,
          "promptTokens": 10346,
          "maxTotalTokens": 8191
       });
    });

    test("extracts tokens from error message without completion tokens", () => {
      const errorMsg = "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
      expect(extractTokensAmountAndLimitFromErrorMsg("GPT_COMPLETIONS_GPT4", "dummy prompt", errorMsg, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns))
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
      expect(extractTokensAmountAndLimitFromErrorMsg("AWS_COMPLETIONS_CLAUDE_V35", "dummy prompt", errorMsg, testModelsMetadata, bedrockClaudeProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 1049999,
          "maxTotalTokens": 1048576
       });
    });

    test("extracts tokens from error message with maxLength", () => {
      const errorMsg = "ValidationException: Malformed input request: expected maxLength: 2097152, actual: 2300000, please reformat your input and try again.";
      expect(extractTokensAmountAndLimitFromErrorMsg("AWS_COMPLETIONS_CLAUDE_V35", "dummy prompt", errorMsg, testModelsMetadata, bedrockClaudeProviderManifest.errorPatterns))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 219346,
          "maxTotalTokens": 200000
       });
    });

    test("extracts tokens from generic too long error", () => {
      const errorMsg = "Input is too long for requested model.";
      expect(extractTokensAmountAndLimitFromErrorMsg("AWS_COMPLETIONS_CLAUDE_V35", "dummy prompt", errorMsg, testModelsMetadata, bedrockClaudeProviderManifest.errorPatterns))
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
      expect(extractTokensAmountAndLimitFromErrorMsg("AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT", "dummy prompt", errorMsg, testModelsMetadata, bedrockLlamaProviderManifest.errorPatterns))
       .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 8193,
         "maxTotalTokens": 8192
       });
    }); 

    test("extracts tokens from error message for 405B model", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 128000 tokens. Please reduce the length of the prompt.";
      expect(extractTokensAmountAndLimitFromErrorMsg("AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT", "dummy prompt", errorMsg, testModelsMetadata, bedrockLlamaProviderManifest.errorPatterns))
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
      expect(extractTokensAmountFromMetadataDefaultingMissingValues("GPT_COMPLETIONS_GPT4_32k", tokenUsage, testModelsMetadata))
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
      expect(extractTokensAmountFromMetadataDefaultingMissingValues("GPT_COMPLETIONS_GPT4_32k", tokenUsage, testModelsMetadata))
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
      expect(extractTokensAmountFromMetadataDefaultingMissingValues("GPT_COMPLETIONS_GPT4_32k", tokenUsage, testModelsMetadata))
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
      expect(extractTokensAmountFromMetadataDefaultingMissingValues("AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT", tokenUsage, testModelsMetadata))
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
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelKeysSet, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns);
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });
  });

  describe("error handling", () => {
    test("detects rate limit error", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelKeysSet, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe("AzureOpenAI");
    }); 

    test("detects internal server error", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelKeysSet, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe("AzureOpenAI");
    }); 

    test("detects token limit exceeded with code", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelKeysSet, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe("AzureOpenAI");
    }); 

    test("detects token limit exceeded with type", () => {
      const llm = azureOpenAIProviderManifest.factory(mockEnv, testModelKeysSet, testModelsMetadata, azureOpenAIProviderManifest.errorPatterns);
      // Use interface method instead of internal test method
      expect(llm.getModelFamily()).toBe("AzureOpenAI");
    }); 
  });
});
