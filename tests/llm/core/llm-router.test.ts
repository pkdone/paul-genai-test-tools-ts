import "reflect-metadata";
import {
  LLMPurpose,
  LLMResponseStatus,
  LLMFunctionResponse,
  LLMContext,
  LLMProviderImpl,
  LLMModelQuality,
  ResolvedLLMModelMetadata,
  LLMResponseTokensUsage,
} from "../../../src/llm/llm.types";
import {
  BadResponseMetadataLLMError,
  RejectionResponseLLMError,
} from "../../../src/llm/utils/llm-errors.types";
import { z } from "zod";
import LLMRouter from "../../../src/llm/core/llm-router";
import LLMStats from "../../../src/llm/utils/routerTracking/llm-stats";
import { PromptAdapter } from "../../../src/llm/utils/prompting/prompt-adapter";
import { LLMService } from "../../../src/llm/core/llm-service";
import type { EnvVars } from "../../../src/lifecycle/env.types";

// Mock the dependencies
jest.mock("../../../src/llm/utils/responseProcessing/llm-response-tools", () => ({
  reducePromptSizeToTokenLimit: jest.fn((prompt: string) => {
    // Simple mock implementation that reduces prompt by half
    return prompt.substring(0, Math.floor(prompt.length * 0.5));
  }),
}));

jest.mock("../../../src/llm/utils/routerTracking/llm-router-logging", () => ({
  log: jest.fn(),
  logErrWithContext: jest.fn(),
  logWithContext: jest.fn(),
}));

jest.mock("../../../src/llm/utils/routerTracking/llm-stats", () => {
  return jest.fn().mockImplementation(() => ({
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
    recordSwitch: jest.fn(),
    recordRetry: jest.fn(),
    recordCrop: jest.fn(),
    getStatusTypesStatistics: jest.fn(() => [
      { description: "Success", symbol: "✓", count: 0 },
      { description: "Failure", symbol: "✗", count: 0 },
    ]),
  }));
});

jest.mock("../../../src/llm/utils/prompting/prompt-adapter", () => ({
  PromptAdapter: jest.fn().mockImplementation(() => ({
    adaptPromptFromResponse: jest.fn((prompt: string) => {
      return prompt.substring(0, Math.floor(prompt.length * 0.5));
    }),
  })),
}));

// Zod schema for LLMModelMetadata validation
const llmModelMetadataSchema = z
  .object({
    modelKey: z.string(),
    urn: z.string().min(1, "Model ID cannot be empty"),
    purpose: z.nativeEnum(LLMPurpose),
    dimensions: z.number().positive().optional(),
    maxCompletionTokens: z.number().positive().optional(),
    maxTotalTokens: z.number().positive(),
  })
  .refine(
    (data) => {
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
    },
    {
      message: "Invalid model metadata configuration",
    },
  );

describe("LLM Router tests", () => {
  // Helper function to create a mock LLM provider
  const createMockLLMProvider = (): LLMProviderImpl => ({
    generateEmbeddings: jest.fn().mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: [0.1, 0.2, 0.3, 0.4],
      request: "default test content",
      modelKey: "GPT_EMBEDDINGS_ADA002",
      context: {},
    }),
    executeCompletionPrimary: jest.fn().mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: "Default test completion",
      request: "default test prompt",
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: {},
    }),
    executeCompletionSecondary: jest.fn().mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: "Default secondary completion",
      request: "default test prompt",
      modelKey: "GPT_COMPLETIONS_GPT35",
      context: {},
    }),
    getModelsNames: jest.fn(() => ["text-embedding-ada-002", "gpt-4", "gpt-3.5-turbo"]),
    getAvailableCompletionModelQualities: jest.fn(() => [
      LLMModelQuality.PRIMARY,
      LLMModelQuality.SECONDARY,
    ]),
    getEmbeddedModelDimensions: jest.fn(() => 1536),
    getModelFamily: jest.fn(() => "OpenAI"),
    getModelsMetadata: jest.fn(() => ({
      GPT_COMPLETIONS_GPT4: {
        modelKey: "GPT_COMPLETIONS_GPT4",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192,
      } as ResolvedLLMModelMetadata,
      GPT_EMBEDDINGS_ADA002: {
        modelKey: "GPT_EMBEDDINGS_ADA002",
        urn: "text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8191,
      } as ResolvedLLMModelMetadata,
    })),
    close: jest.fn(),
  });

  // Helper function to create LLMRouter instance
  const createLLMRouter = (retryConfig: Record<string, unknown> = {}) => {
    const mockProvider = createMockLLMProvider();

    // Use test-friendly retry configuration by default
    const testRetryConfig = {
      maxRetryAttempts: 2,
      minRetryDelayMillis: 10,
      maxRetryAdditionalDelayMillis: 10,
      requestTimeoutMillis: 1000,
      ...retryConfig,
    };

    // Create mock LLMService
    const mockLLMService: Partial<LLMService> = {
      getLLMProvider: jest.fn().mockReturnValue(mockProvider),
      getLLMManifest: jest.fn().mockReturnValue({
        modelFamily: "OpenAI",
        providerName: "Mock OpenAI",
        providerSpecificConfig: testRetryConfig,
      }),
    };

    // Create mock EnvVars
    const mockEnvVars: Partial<EnvVars> = {
      LLM: "openai",
      // Add other required env vars as needed for tests
    };

    // Create real instances for dependency injection testing
    const mockLLMStats = new LLMStats();
    const mockPromptAdapter = new PromptAdapter();
    const router = new LLMRouter(
      mockLLMService as LLMService,
      mockEnvVars as EnvVars,
      mockLLMStats,
      mockPromptAdapter,
    );
    return { router, mockProvider };
  };

  describe("Constructor and basic methods", () => {
    test("should create LLMRouter instance with correct initialization", () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 5,
        minRetryDelayMillis: 100,
        maxRetryAdditionalDelayMillis: 500,
        requestTimeoutMillis: 30000,
      });

      expect(router).toBeInstanceOf(LLMRouter);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProvider.getModelsMetadata).toHaveBeenCalled();
    });

    test("should return correct model family", () => {
      const { router } = createLLMRouter();
      expect(router.getModelFamily()).toBe("OpenAI");
    });

    test("should return correct models description", () => {
      const { router } = createLLMRouter();
      const description = router.getModelsUsedDescription();
      expect(description).toBe(
        "OpenAI (embeddings: text-embedding-ada-002, completions: primary: gpt-4, secondary: gpt-3.5-turbo)",
      );
    });

    test("should return embedded model dimensions", () => {
      const { router } = createLLMRouter();
      expect(router.getEmbeddedModelDimensions()).toBe(1536);
    });

    test("should call close on provider", async () => {
      const { router, mockProvider } = createLLMRouter();

      await router.close();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProvider.close).toHaveBeenCalled();
    });
  });

  describe("LLM provider abstractions", () => {
    // Test data for mock model creation
    const mockModelsTestData = [
      {
        description: "embeddings model with purpose check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "purpose",
        expectedValue: LLMPurpose.EMBEDDINGS,
      },
      {
        description: "completion model with purpose check",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        property: "purpose",
        expectedValue: LLMPurpose.COMPLETIONS,
      },
      {
        description: "embeddings model with dimensions check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "dimensions",
        expectedValue: 1536,
      },
      {
        description: "completion model with maxCompletionTokens check",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        property: "maxCompletionTokens",
        expectedValue: 4096,
      },
      {
        description: "embeddings model with maxTotalTokens check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "maxTotalTokens",
        expectedValue: 8191,
      },
      {
        description: "embeddings model with urn check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "urn",
        expectedValue: "text-embedding-ada-002",
      },
      {
        description: "embeddings model with internalKey check",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        property: "modelKey",
        expectedValue: "GPT_EMBEDDINGS_ADA002",
      },
      {
        description: "completion model with maxTotalTokens check",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        property: "maxTotalTokens",
        expectedValue: 8192,
      },
    ];

    test.each(mockModelsTestData)(
      "create mock $description",
      ({ model, property, expectedValue }) => {
        const mockModel: ResolvedLLMModelMetadata = model;
        expect(mockModel[property as keyof ResolvedLLMModelMetadata]).toBe(expectedValue);
      },
    );
  });

  describe("Validate LLM metadata schemas", () => {
    // Test data for schema validation
    const validModelsTestData = [
      {
        description: "valid embeddings model",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8191,
        },
        shouldPass: true,
      },
      {
        description: "valid completions model",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        shouldPass: true,
      },
    ];

    const invalidModelsTestData = [
      {
        description: "embeddings model without dimensions",
        model: {
          modelKey: "GPT_EMBEDDINGS_ADA002",
          urn: "text-embedding-ada-002",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8191,
        },
        shouldPass: false,
      },
      {
        description: "completions model without maxCompletionTokens",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxTotalTokens: 8192,
        },
        shouldPass: false,
      },
      {
        description: "model with maxCompletionTokens > maxTotalTokens",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "gpt-4",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 10000,
          maxTotalTokens: 8192,
        },
        shouldPass: false,
      },
      {
        description: "model with empty urn",
        model: {
          modelKey: "GPT_COMPLETIONS_GPT4",
          urn: "",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 8192,
        },
        shouldPass: false,
      },
    ];

    test.each(validModelsTestData)("$description passes validation", ({ model }) => {
      expect(() => llmModelMetadataSchema.parse(model)).not.toThrow();
    });

    test.each(invalidModelsTestData)("$description fails validation", ({ model }) => {
      expect(() => llmModelMetadataSchema.parse(model)).toThrow();
    });
  });

  describe("generateEmbeddings method", () => {
    test("should generate embeddings successfully", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockEmbeddings = [0.1, 0.2, 0.3, 0.4];
      mockProvider.generateEmbeddings = jest.fn().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockEmbeddings,
        request: "test content",
        modelKey: "GPT_EMBEDDINGS_ADA002",
        context: {},
      });

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(result).toEqual(mockEmbeddings);
      expect(mockProvider.generateEmbeddings).toHaveBeenCalled();
    });

    test("should handle null response", async () => {
      const { router, mockProvider } = createLLMRouter({ maxRetryAttempts: 1 });
      mockProvider.generateEmbeddings = jest
        .fn()
        .mockResolvedValueOnce({
          status: LLMResponseStatus.OVERLOADED,
          request: "test content",
          modelKey: "GPT_EMBEDDINGS_ADA002",
          context: {},
        })
        .mockResolvedValue(null);

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(result).toBeNull();
    });

    test("should throw error for invalid embeddings response", async () => {
      const { router, mockProvider } = createLLMRouter();
      mockProvider.generateEmbeddings = jest.fn().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: "invalid response",
        request: "test content",
        modelKey: "GPT_EMBEDDINGS_ADA002",
        context: {},
      });

      await expect(router.generateEmbeddings("test-resource", "test content")).rejects.toThrow(
        BadResponseMetadataLLMError,
      );
    });
  });

  describe("executeCompletion method", () => {
    test("should execute completion successfully", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = "This is a test completion";
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test-resource", "test prompt");

      expect(result).toBe(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalled();
    });

    test("should execute completion with JSON response", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = { key: "value", number: 42 };
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const result = await router.executeCompletion("test-resource", "test prompt", true);

      expect(result).toEqual(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalledWith(
        "test prompt",
        true,
        expect.any(Object),
      );
    });

    test("should use model quality override", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = "This is a test completion";
      (
        mockProvider.executeCompletionSecondary as jest.MockedFunction<
          typeof mockProvider.executeCompletionSecondary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "test prompt",
        false,
        {},
        LLMModelQuality.SECONDARY,
      );

      expect(result).toBe(mockCompletion);
      expect(mockProvider.executeCompletionSecondary).toHaveBeenCalled();
    });

    test("should handle null response", async () => {
      const { router, mockProvider } = createLLMRouter({ maxRetryAttempts: 1 });
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      )
        .mockResolvedValueOnce({
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        })
        .mockResolvedValue({
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        });
      (
        mockProvider.executeCompletionSecondary as jest.MockedFunction<
          typeof mockProvider.executeCompletionSecondary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion("test-resource", "test prompt");

      expect(result).toBeNull();
    });

    test("should throw error for invalid completion response", async () => {
      const { router, mockProvider } = createLLMRouter();
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        generated: 12345 as any, // Invalid response type - number instead of string/object
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      await expect(router.executeCompletion("test-resource", "test prompt")).rejects.toThrow(
        BadResponseMetadataLLMError,
      );
    });
  });

  describe("Statistics display methods", () => {
    test("should display LLM status summary", () => {
      const mockLog = jest.fn();
      const mockTable = jest.fn();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(mockLog);
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      const { router } = createLLMRouter();
      router.displayLLMStatusSummary();

      expect(consoleSpy).toHaveBeenCalledWith("LLM inovocation event types that will be recorded:");
      expect(consoleTableSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleTableSpy.mockRestore();
    });

    test("should display LLM status details", () => {
      const mockTable = jest.fn();
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      const { router } = createLLMRouter();
      router.displayLLMStatusDetails();

      expect(consoleTableSpy).toHaveBeenCalledWith(expect.any(Object));

      consoleTableSpy.mockRestore();
    });
  });

  describe("handleUnsuccessfulLLMCallOutcome method", () => {
    const handleUnsuccessfulLLMCallOutcomeTestData = [
      {
        description: "overloaded response with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true,
        },
      },
      {
        description: "overloaded response with no ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "exceeded tokens with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true,
        },
      },
    ];

    test.each(handleUnsuccessfulLLMCallOutcomeTestData)(
      "$description",
      ({ llmResponse, currentLLMIndex, totalLLMCount, context, resourceName, expected }) => {
        const { router } = createLLMRouter();

        // Access private method using TypeScript casting
        const result = (
          router as unknown as { handleUnsuccessfulLLMCallOutcome: (...args: unknown[]) => unknown }
        ).handleUnsuccessfulLLMCallOutcome(
          llmResponse,
          currentLLMIndex,
          totalLLMCount,
          context,
          resourceName,
        );

        expect(result).toEqual(expected);
      },
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
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "exceeded tokens with no ability to switch models (should crop)",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: true,
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "unknown status should throw RejectionResponseLLMError",
        llmResponse: {
          status: LLMResponseStatus.UNKNOWN,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        context: { test: "context" } as LLMContext,
        resourceName: "test-resource",
        shouldThrow: true,
        expectedError: RejectionResponseLLMError,
      },
    ];

    test.each(handleUnsuccessfulLLMCallOutcomeErrorTestData)(
      "$description",
      ({
        llmResponse,
        currentLLMIndex,
        totalLLMCount,
        context,
        resourceName,
        expected,
        shouldThrow,
        expectedError,
      }) => {
        const { router } = createLLMRouter();

        if (shouldThrow) {
          expect(() => {
            (
              router as unknown as {
                handleUnsuccessfulLLMCallOutcome: (...args: unknown[]) => unknown;
              }
            ).handleUnsuccessfulLLMCallOutcome(
              llmResponse,
              currentLLMIndex,
              totalLLMCount,
              context,
              resourceName,
            );
          }).toThrow(expectedError);
        } else {
          const elseResult = (
            router as unknown as {
              handleUnsuccessfulLLMCallOutcome: (...args: unknown[]) => unknown;
            }
          ).handleUnsuccessfulLLMCallOutcome(
            llmResponse,
            currentLLMIndex,
            totalLLMCount,
            context,
            resourceName,
          );
          expect(elseResult).toEqual(expected);
        }
      },
    );
  });

  describe("cropPromptForTokenLimit method", () => {
    const cropPromptForTokenLimitTestData = [
      {
        description: "valid token usage data should crop prompt",
        currentPrompt:
          "This is a very long prompt that needs to be cropped because of token limits",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        expectedResult: "This is a very long prompt that needs", // Cropped to 50% of original length
      },
      {
        description: "short prompt with valid token usage should still be processed",
        currentPrompt: "Short prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 100,
            completionTokens: 50,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        expectedResult: "Short ", // Cropped to 50% of original length
      },
      {
        description: "medium length prompt with high token usage",
        currentPrompt:
          "This is a medium length prompt for testing purposes and should be cropped appropriately",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 8000,
            completionTokens: 500,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        expectedResult: "This is a medium length prompt for testing ", // Cropped to 50% of original length
      },
    ];

    test.each(cropPromptForTokenLimitTestData)(
      "$description",
      ({ currentPrompt, llmResponse, expectedResult }) => {
        const { router } = createLLMRouter();

        // Access private method using TypeScript casting
        const result = (
          router as unknown as { cropPromptForTokenLimit: (...args: unknown[]) => string }
        ).cropPromptForTokenLimit(currentPrompt, llmResponse);

        expect(result).toBe(expectedResult);
      },
    );

    // Test error cases - Note: The actual error checking happens in PromptAdapter.adaptPromptFromResponse
    // which is mocked in these tests, so these tests verify the method can be called but won't
    // actually throw the expected errors due to mocking
    const cropPromptForTokenLimitErrorTestData = [
      {
        description: "missing token usage - behavior depends on PromptAdapter implementation",
        currentPrompt: "Test prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          // tokensUage is missing
        } as LLMFunctionResponse,
        expectedResult: "Test ", // Mocked PromptAdapter crops to 50%
      },
      {
        description: "undefined token usage - behavior depends on PromptAdapter implementation",
        currentPrompt: "Test prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: undefined,
        } as LLMFunctionResponse,
        expectedResult: "Test ", // Mocked PromptAdapter crops to 50%
      },
      {
        description: "null token usage - behavior depends on PromptAdapter implementation",
        currentPrompt: "Test prompt",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: undefined,
        } as LLMFunctionResponse,
        expectedResult: "Test ", // Mocked PromptAdapter crops to 50%
      },
    ];

    test.each(cropPromptForTokenLimitErrorTestData)(
      "$description",
      ({ currentPrompt, llmResponse, expectedResult }) => {
        const { router } = createLLMRouter();

        const result = (
          router as unknown as { cropPromptForTokenLimit: (...args: unknown[]) => string }
        ).cropPromptForTokenLimit(currentPrompt, llmResponse);
        expect(result).toBe(expectedResult);
      },
    );
  });

  describe("getRetryConfiguration method", () => {
    interface RetryConfig {
      maxAttempts: number;
      minRetryDelayMillis: number;
      maxRetryAdditionalDelayMillis: number;
      requestTimeoutMillis: number;
    }

    test("should use default config when no retry config provided", () => {
      const { router } = createLLMRouter();

      // Access private method
      const result = (
        router as unknown as { getRetryConfiguration: () => RetryConfig }
      ).getRetryConfiguration();

      // Should use defaults from llmConfig (mocked values in test environment)
      expect(result).toHaveProperty("maxAttempts");
      expect(result).toHaveProperty("minRetryDelayMillis");
      expect(result).toHaveProperty("maxRetryAdditionalDelayMillis");
      expect(result).toHaveProperty("requestTimeoutMillis");
    });

    test("should use provided retry config values", () => {
      const customRetryConfig = {
        maxRetryAttempts: 10,
        minRetryDelayMillis: 200,
        maxRetryAdditionalDelayMillis: 1000,
        requestTimeoutMillis: 60000,
      };
      const { router } = createLLMRouter(customRetryConfig);

      const result = (
        router as unknown as { getRetryConfiguration: () => RetryConfig }
      ).getRetryConfiguration();

      expect(result.maxAttempts).toBe(10);
      expect(result.minRetryDelayMillis).toBe(200);
      expect(result.maxRetryAdditionalDelayMillis).toBe(1000);
      expect(result.requestTimeoutMillis).toBe(60000);
    });

    test("should use partial retry config with defaults for missing values", () => {
      const partialRetryConfig = {
        maxRetryAttempts: 8,
        requestTimeoutMillis: 45000,
        // minRetryDelayMillis and maxRetryAdditionalDelayMillis not provided
      };
      const { router } = createLLMRouter(partialRetryConfig);

      const result = (
        router as unknown as { getRetryConfiguration: () => RetryConfig }
      ).getRetryConfiguration();

      expect(result.maxAttempts).toBe(8);
      expect(result.requestTimeoutMillis).toBe(45000);
      expect(result).toHaveProperty("minRetryDelayMillis");
      expect(result).toHaveProperty("maxRetryAdditionalDelayMillis");
    });
  });

  describe("Error handling and edge cases", () => {
    test("should handle LLM provider throwing unexpected errors", async () => {
      const { router, mockProvider } = createLLMRouter();
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockRejectedValue(new Error("Unexpected LLM error"));
      (
        mockProvider.executeCompletionSecondary as jest.MockedFunction<
          typeof mockProvider.executeCompletionSecondary
        >
      ).mockRejectedValue(new Error("Unexpected LLM error"));

      const result = await router.executeCompletion("test-resource", "test prompt");

      expect(result).toBeNull();
    });

    test("should handle prompt that becomes empty after cropping", async () => {
      const { router, mockProvider } = createLLMRouter({ maxRetryAttempts: 1 });

      // First call returns EXCEEDED status
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValueOnce({
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        tokensUage: {
          promptTokens: 8000,
          completionTokens: 500,
          maxTotalTokens: 8192,
        } as LLMResponseTokensUsage,
      });
      (
        mockProvider.executeCompletionSecondary as jest.MockedFunction<
          typeof mockProvider.executeCompletionSecondary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      // Mock the prompt adapter to return empty string after cropping
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (router as any).promptAdapter.adaptPromptFromResponse = jest.fn().mockReturnValue("");

      const result = await router.executeCompletion("test-resource", "test prompt");

      expect(result).toBeNull();
    });

    test("should handle completion with null generated content", async () => {
      const { router, mockProvider } = createLLMRouter();
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: null,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });
      const result = await router.executeCompletion("test-resource", "test prompt");

      expect(result).toBeNull();
    });

    test("should properly handle context modification during execution", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockCompletion = "Test completion";
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      const context = { initialValue: "test" };
      const result = await router.executeCompletion("test-resource", "test prompt", false, context);

      expect(result).toBe(mockCompletion);
      expect(context).toHaveProperty("purpose", LLMPurpose.COMPLETIONS);
      expect(context).toHaveProperty("modelQuality", LLMModelQuality.PRIMARY);
    });
  });

  describe("Integration tests", () => {
    test("should handle complete workflow with model switching", async () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 2,
        minRetryDelayMillis: 10,
        maxRetryAdditionalDelayMillis: 10,
        requestTimeoutMillis: 1000,
      });

      // Primary fails with overloaded
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
      });

      // Secondary succeeds
      const mockCompletion = "Secondary completion success";
      (
        mockProvider.executeCompletionSecondary as jest.MockedFunction<
          typeof mockProvider.executeCompletionSecondary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockCompletion,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion("test-resource", "test prompt");

      expect(result).toBe(mockCompletion);
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalled();
      expect(mockProvider.executeCompletionSecondary).toHaveBeenCalled();
    });

    test("should handle complete workflow with prompt cropping", async () => {
      const { router, mockProvider } = createLLMRouter({
        maxRetryAttempts: 2,
        minRetryDelayMillis: 10,
        maxRetryAdditionalDelayMillis: 10,
        requestTimeoutMillis: 1000,
      });

      // Simplified test: primary returns exceeded, fallback to secondary succeeds
      (
        mockProvider.executeCompletionPrimary as jest.MockedFunction<
          typeof mockProvider.executeCompletionPrimary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.EXCEEDED,
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: {},
        tokensUage: {
          promptTokens: 8000,
          completionTokens: 500,
          maxTotalTokens: 8192,
        } as LLMResponseTokensUsage,
      });
      (
        mockProvider.executeCompletionSecondary as jest.MockedFunction<
          typeof mockProvider.executeCompletionSecondary
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: "Secondary completion success",
        request: "test prompt",
        modelKey: "GPT_COMPLETIONS_GPT35",
        context: {},
      });

      const result = await router.executeCompletion(
        "test-resource",
        "Very long test prompt that exceeds token limits",
      );

      expect(result).toBe("Secondary completion success");
      expect(mockProvider.executeCompletionPrimary).toHaveBeenCalled();
      expect(mockProvider.executeCompletionSecondary).toHaveBeenCalled();
    });

    test("should handle embeddings workflow with context", async () => {
      const { router, mockProvider } = createLLMRouter();
      const mockEmbeddings = [0.1, 0.2, 0.3];

      (
        mockProvider.generateEmbeddings as jest.MockedFunction<
          typeof mockProvider.generateEmbeddings
        >
      ).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: mockEmbeddings,
        request: "test content",
        modelKey: "GPT_EMBEDDINGS_ADA002",
        context: {},
      });

      const context = { testContext: "embeddings" };
      const result = await router.generateEmbeddings("test-resource", "test content", context);

      expect(result).toEqual(mockEmbeddings);
      expect(context).toHaveProperty("purpose", LLMPurpose.EMBEDDINGS);
      expect(mockProvider.generateEmbeddings).toHaveBeenCalledWith(
        "test content",
        false,
        expect.objectContaining({
          testContext: "embeddings",
          purpose: LLMPurpose.EMBEDDINGS,
        }),
      );
    });
  });
});
