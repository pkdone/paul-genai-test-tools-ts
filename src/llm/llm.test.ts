// filepath: /home/pdone/Projects/paul-genai-test-tools-ts/src/llm/llm.test.ts
import { LLMModelMetadata, LLMPurpose, LLMResponseStatus, LLMFunctionResponse, LLMContext, LLMProviderImpl, 
         LLMModelQuality, ResolvedLLMModelMetadata, LLMResponseTokensUsage } from "../types/llm.types";
import { BadResponseMetadataLLMError, RejectionResponseLLMError } from "../types/llm-errors.types";
import { z } from "zod";
import LLMRouter from "./llm-router";

// Mock the dependencies
jest.mock("./response-processing/llm-response-tools", () => ({
  reducePromptSizeToTokenLimit: jest.fn((prompt: string) => {
    // Simple mock implementation that reduces prompt by half
    return prompt.substring(0, Math.floor(prompt.length * 0.5));
  })
}));

jest.mock("./router-logging/llm-router-logging", () => ({
  log: jest.fn(),
  logErrWithContext: jest.fn(),
  logWithContext: jest.fn()
}));

jest.mock("./router-logging/llm-stats", () => {
  return jest.fn().mockImplementation(() => ({
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
    recordSwitch: jest.fn(),
    recordRetry: jest.fn(),
    recordCrop: jest.fn(),
    getStatusTypesStatistics: jest.fn()
  }));
});

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
  // Helper function to create a mock LLM provider
  const createMockLLMProvider = (): LLMProviderImpl => ({
    generateEmbeddings: jest.fn(),
    executeCompletionPrimary: jest.fn(),
    executeCompletionSecondary: jest.fn(),
    getModelsNames: jest.fn(() => ["text-embedding-ada-002", "gpt-4", "gpt-3.5-turbo"]),
    getAvailableCompletionModelQualities: jest.fn(() => [LLMModelQuality.PRIMARY, LLMModelQuality.SECONDARY]),
    getEmbeddedModelDimensions: jest.fn(() => 1536),
    getModelFamily: jest.fn(() => "OpenAI"),
    getModelsMetadata: jest.fn(() => ({
      "GPT_COMPLETIONS_GPT4": {
        internalKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192
      } as ResolvedLLMModelMetadata
    })),
    close: jest.fn()
  });

  // Helper function to create LLMRouter instance
  const createLLMRouter = () => {
    const mockProvider = createMockLLMProvider();
    return new LLMRouter(mockProvider);
  };

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

  describe("handleUnsuccessfulLLMCallOutcome method", () => {
    const handleUnsuccessfulLLMCallOutcomeTestData = [
      {
        description: "overloaded response with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true
        }
      },
      {
        description: "overloaded response with no ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false
        }
      },
      {
        description: "exceeded tokens with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192
          } as LLMResponseTokensUsage
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true
        }
      }
    ];

    test.each(handleUnsuccessfulLLMCallOutcomeTestData)(
      "$description",
      ({ llmResponse, currentLLMIndex, totalLLMCount, context, resourceName, expected }) => {
        const router = createLLMRouter();
        
        // Access private method using TypeScript casting
        const result = (router as unknown as { handleUnsuccessfulLLMCallOutcome: (...args: unknown[]) => unknown }).handleUnsuccessfulLLMCallOutcome(
          llmResponse, 
          currentLLMIndex, 
          totalLLMCount, 
          context, 
          resourceName
        );

        expect(result).toEqual(expected);
      }
    );

    // Test cases for errors
    const handleUnsuccessfulLLMCallOutcomeErrorTestData = [
      {
        description: "null response (treated as overloaded) with no ability to switch",
        llmResponse: null,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false
        }
      },
      {
        description: "exceeded tokens with no ability to switch models (should crop)",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192
          } as LLMResponseTokensUsage
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: true,
          shouldSwitchToNextLLM: false
        }
      },
      {
        description: "unknown status should throw RejectionResponseLLMError",
        llmResponse: {
          status: LLMResponseStatus.UNKNOWN,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        shouldThrow: true,
        expectedError: RejectionResponseLLMError
      }
    ];

    test.each(handleUnsuccessfulLLMCallOutcomeErrorTestData)(
      "$description",
      ({ llmResponse, currentLLMIndex, totalLLMCount, context, resourceName, expected, shouldThrow, expectedError }) => {
        const router = createLLMRouter();
        
        if (shouldThrow) {
          expect(() => {
            (router as unknown as { handleUnsuccessfulLLMCallOutcome: (...args: unknown[]) => unknown }).handleUnsuccessfulLLMCallOutcome(
              llmResponse, 
              currentLLMIndex, 
              totalLLMCount, 
              context, 
              resourceName
            );
          }).toThrow(expectedError);
        } else {
          const elseResult = (router as unknown as { handleUnsuccessfulLLMCallOutcome: (...args: unknown[]) => unknown }).handleUnsuccessfulLLMCallOutcome(
            llmResponse, 
            currentLLMIndex, 
            totalLLMCount, 
            context, 
            resourceName
          );
          expect(elseResult).toEqual(expected);
        }
      }
    );
  });

  describe("cropPromptForTokenLimit method", () => {
    const cropPromptForTokenLimitTestData = [
      {
        description: "valid token usage data should crop prompt",
        currentPrompt: "This is a very long prompt that needs to be cropped because of token limits",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192
          } as LLMResponseTokensUsage
        } as LLMFunctionResponse,
        expectedResult: "This is a very long prompt that needs" // Cropped by mock to half length
      },
      {
        description: "short prompt with valid token usage should still be processed",
        currentPrompt: "Short prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 100,
            completionTokens: 50,
            maxTotalTokens: 8192
          } as LLMResponseTokensUsage
        } as LLMFunctionResponse,
        expectedResult: "Short " // Cropped by mock to half length
      },
      {
        description: "medium length prompt with high token usage",
        currentPrompt: "This is a medium length prompt for testing purposes and should be cropped appropriately",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 8000,
            completionTokens: 500,
            maxTotalTokens: 8192
          } as LLMResponseTokensUsage
        } as LLMFunctionResponse,
        expectedResult: "This is a medium length prompt for testing " // Cropped by mock to half length
      }
    ];

    test.each(cropPromptForTokenLimitTestData)(
      "$description",
      ({ currentPrompt, llmResponse, expectedResult }) => {
        const router = createLLMRouter();
        
        // Access private method using TypeScript casting
        const result = (router as unknown as { cropPromptForTokenLimit: (...args: unknown[]) => string }).cropPromptForTokenLimit(currentPrompt, llmResponse);

        expect(result).toBe(expectedResult);
      }
    );

    // Test error cases
    const cropPromptForTokenLimitErrorTestData = [
      {
        description: "missing token usage should throw BadResponseMetadataLLMError",
        currentPrompt: "Test prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          // tokensUage is missing
        } as LLMFunctionResponse,
        expectedError: BadResponseMetadataLLMError
      },
      {
        description: "undefined token usage should throw BadResponseMetadataLLMError",
        currentPrompt: "Test prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: undefined
        } as LLMFunctionResponse,
        expectedError: BadResponseMetadataLLMError
      },
      {
        description: "null token usage should throw BadResponseMetadataLLMError",
        currentPrompt: "Test prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelInternalKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: undefined
        } as LLMFunctionResponse,
        expectedError: BadResponseMetadataLLMError
      }
    ];

    test.each(cropPromptForTokenLimitErrorTestData)(
      "$description",
      ({ currentPrompt, llmResponse, expectedError }) => {
        const router = createLLMRouter();
        
        expect(() => {
          (router as unknown as { cropPromptForTokenLimit: (...args: unknown[]) => string }).cropPromptForTokenLimit(currentPrompt, llmResponse);
        }).toThrow(expectedError);
      }
    );
  });
});
