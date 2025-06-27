/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'reflect-metadata';
import { z } from 'zod';
import { LLMStructuredResponseInvoker } from './llm-structured-response-invoker';
import type LLMRouter from '../llm/llm-router';
import * as errorUtils from '../utils/error-utils';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Mock dependencies
jest.mock('../llm/llm-router');
jest.mock('../utils/error-utils', () => ({
  logErrorMsgAndDetail: jest.fn(),
}));
jest.mock('zod-to-json-schema');

const mockLogErrorMsgAndDetail = errorUtils.logErrorMsgAndDetail as jest.MockedFunction<typeof errorUtils.logErrorMsgAndDetail>;
const mockZodToJsonSchema = zodToJsonSchema as jest.MockedFunction<typeof zodToJsonSchema>;

describe('LLMStructuredResponseInvoker', () => {
  let llmInvoker: LLMStructuredResponseInvoker;
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  // Test schemas
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  });

  const simpleSchema = z.object({
    message: z.string(),
  });

  const complexSchema = z.object({
    id: z.number(),
    data: z.object({
      values: z.array(z.string()),
      metadata: z.object({
        created: z.string(),
        valid: z.boolean(),
      }),
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock LLMRouter
    mockLLMRouter = {
      executeCompletion: jest.fn(),
      generateEmbeddings: jest.fn(),
      getModelFamily: jest.fn(),
      getModelsUsedDescription: jest.fn(),
      getEmbeddedModelDimensions: jest.fn(),
      displayLLMStatusSummary: jest.fn(),
      displayLLMStatusDetails: jest.fn(),
      cropPromptForTokenLimit: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create LLMStructuredResponseInvoker instance
    llmInvoker = new LLMStructuredResponseInvoker(mockLLMRouter);

    // Mock zodToJsonSchema to return a simple schema representation
    mockZodToJsonSchema.mockReturnValue({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      },
      required: ['name', 'age']
    });
  });

  describe('getStructuredResponse', () => {
    describe('successful responses', () => {
      test('should return valid response on first attempt', async () => {
        const validResponse = {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        const result = await llmInvoker.getStructuredResponse(
          'test-resource',
          'Generate user data',
          userSchema,
          'user generation task'
        );

        expect(result).toEqual(validResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          'test-resource',
          'Generate user data',
          true,
          { resource: 'test-resource', requireJSON: true }
        );
        expect(mockLogErrorMsgAndDetail).not.toHaveBeenCalled();
      });

      test('should return valid response after self-correction', async () => {
        const invalidResponse = {
          name: 'John Doe',
          age: 'thirty', // Invalid: should be number
          email: 'john@example.com',
        };

        const validCorrectedResponse = {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
        };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidResponse)
          .mockResolvedValueOnce(validCorrectedResponse);

        const result = await llmInvoker.getStructuredResponse(
          'test-resource',
          'Generate user data',
          userSchema,
          'user generation task'
        );

        expect(result).toEqual(validCorrectedResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(2);
        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
          "Validation failed for 'user generation task' - attempting self-correction...",
          expect.any(Object)
        );

        // Verify correction prompt was built correctly
        const correctionCall = mockLLMRouter.executeCompletion.mock.calls[1];
        expect(correctionCall[0]).toBe('test-resource-fix');
        expect(correctionCall[1]).toContain('The previous JSON response had validation errors');
        expect(correctionCall[1]).toContain('ORIGINAL JSON:');
        expect(correctionCall[1]).toContain('SCHEMA:');
        expect(correctionCall[1]).toContain('VALIDATION ERRORS:');
      });

      test('should handle simple schema successfully', async () => {
        const validResponse = { message: 'Hello World' };

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        const result = await llmInvoker.getStructuredResponse(
          'simple-task',
          'Generate greeting',
          simpleSchema,
          'greeting task'
        );

        expect(result).toEqual(validResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      });

      test('should handle complex nested schema successfully', async () => {
        const validResponse = {
          id: 123,
          data: {
            values: ['a', 'b', 'c'],
            metadata: {
              created: '2023-01-01',
              valid: true,
            },
          },
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        const result = await llmInvoker.getStructuredResponse(
          'complex-task',
          'Generate complex data',
          complexSchema,
          'complex data task'
        );

        expect(result).toEqual(validResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      });
    });

    describe('error handling', () => {
      test('should throw error when both attempts fail validation', async () => {
        const invalidResponse = {
          name: 'John Doe',
          age: 'thirty', // Invalid: should be number
          email: 'invalid-email', // Invalid: not a valid email
        };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidResponse)
          .mockResolvedValueOnce(invalidResponse);

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow(/Failed to get schema valid LLM JSON response even after retry for user generation task/);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(2);
        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledTimes(1);
      });

      test('should throw error when LLM returns null', async () => {
        mockLLMRouter.executeCompletion.mockResolvedValue(null);

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow(/LLM returned non-object JSON for test-resource: object/);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      });

      test('should throw error when LLM returns array', async () => {
        const arrayResponse: number[] = [1, 2, 3];
        mockLLMRouter.executeCompletion.mockResolvedValue(arrayResponse);

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow(/LLM returned non-object JSON for test-resource: object/);
      });

      test('should throw error when LLM returns primitive value', async () => {
        const stringResponse = 'just a string';
        mockLLMRouter.executeCompletion.mockResolvedValue(stringResponse);

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow(/LLM returned non-object JSON for test-resource: string/);
      });

      test('should throw error when LLM returns number array as single number', async () => {
        // Since LLMGeneratedContent doesn't include plain numbers, we'll test with array as invalid object type
        const numberArrayResponse: number[] = [42];
        mockLLMRouter.executeCompletion.mockResolvedValue(numberArrayResponse);

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow(/LLM returned non-object JSON for test-resource: object/);
      });

      test('should handle LLM execution error', async () => {
        mockLLMRouter.executeCompletion.mockRejectedValue(new Error('LLM service unavailable'));

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow('LLM service unavailable');

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      });

      test('should handle LLM execution error during correction', async () => {
        const invalidResponse = {
          name: 'John Doe',
          age: 'thirty', // Invalid
        };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidResponse)
          .mockRejectedValueOnce(new Error('LLM service error during correction'));

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate user data',
            userSchema,
            'user generation task'
          )
        ).rejects.toThrow('LLM service error during correction');

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(2);
        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledTimes(1);
      });
    });

    describe('schema validation edge cases', () => {
      test('should handle empty object schema', async () => {
        const emptySchema = z.object({});
        const validResponse = {};

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        const result = await llmInvoker.getStructuredResponse(
          'test-resource',
          'Generate empty object',
          emptySchema,
          'empty object task'
        );

        expect(result).toEqual({});
      });

      test('should handle optional fields in schema', async () => {
        const schemaWithOptional = z.object({
          required: z.string(),
          optional: z.string().optional(),
        });

        const validResponse = { required: 'test' };

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        const result = await llmInvoker.getStructuredResponse(
          'test-resource',
          'Generate data with optional field',
          schemaWithOptional,
          'optional field task'
        );

        expect(result).toEqual({ required: 'test' });
      });

      test('should handle schema with default values', async () => {
        const schemaWithDefaults = z.object({
          name: z.string(),
          active: z.boolean().default(true),
        });

        const validResponse = { name: 'test', active: false };

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        const result = await llmInvoker.getStructuredResponse(
          'test-resource',
          'Generate data with defaults',
          schemaWithDefaults,
          'defaults task'
        );

        expect(result).toEqual({ name: 'test', active: false });
      });

      test('should handle array schema', async () => {
        const arraySchema = z.array(z.string());
        const validResponse: number[] = [1, 2, 3]; // LLMGeneratedContent expects number[] for arrays

        // Note: This will fail because the method expects an object, but testing the behavior
        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        await expect(
          llmInvoker.getStructuredResponse(
            'test-resource',
            'Generate array',
            arraySchema,
            'array task'
          )
        ).rejects.toThrow(/LLM returned non-object JSON/);
      });
    });

    describe('correction prompt building', () => {
      test('should build comprehensive correction prompt', async () => {
        const invalidResponse = {
          name: 'John',
          age: 'not-a-number',
          email: 'invalid-email',
        };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidResponse)
          .mockResolvedValueOnce({ name: 'John', age: 30, email: 'john@example.com' });

        await llmInvoker.getStructuredResponse(
          'test-resource',
          'Generate user data',
          userSchema,
          'user generation task'
        );

        const correctionCall = mockLLMRouter.executeCompletion.mock.calls[1];
        const correctionPrompt = correctionCall[1];

        expect(correctionPrompt).toContain('The previous JSON response had validation errors');
        expect(correctionPrompt).toContain('ORIGINAL JSON:');
        expect(correctionPrompt).toContain(JSON.stringify(invalidResponse));
        expect(correctionPrompt).toContain('SCHEMA:');
        expect(correctionPrompt).toContain('VALIDATION ERRORS:');
        expect(correctionPrompt).toContain('Return ONLY the corrected, valid JSON object');
        expect(mockZodToJsonSchema).toHaveBeenCalledWith(userSchema);
      });

      test('should handle complex validation errors in correction prompt', async () => {
        const invalidComplexResponse = {
          id: 'not-a-number',
          data: {
            values: 'not-an-array',
            metadata: 'not-an-object',
          },
        };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidComplexResponse)
          .mockResolvedValueOnce({
            id: 123,
            data: {
              values: ['a', 'b'],
              metadata: { created: '2023-01-01', valid: true },
            },
          });

        await llmInvoker.getStructuredResponse(
          'complex-resource',
          'Generate complex data',
          complexSchema,
          'complex task'
        );

        const correctionCall = mockLLMRouter.executeCompletion.mock.calls[1];
        expect(correctionCall[0]).toBe('complex-resource-fix');
        expect(correctionCall[1]).toContain(JSON.stringify(invalidComplexResponse));
      });
    });

    describe('integration with LLMRouter', () => {
      test('should pass correct parameters to LLMRouter.executeCompletion', async () => {
        const validResponse = { message: 'test' };
        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        await llmInvoker.getStructuredResponse(
          'integration-test',
          'Test prompt',
          simpleSchema,
          'integration task'
        );

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          'integration-test',
          'Test prompt',
          true, // asJSON = true
          { resource: 'integration-test', requireJSON: true }
        );
      });

      test('should handle different resource names correctly', async () => {
        const validResponse = { message: 'test' };
        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        await llmInvoker.getStructuredResponse(
          'special-resource-name-123',
          'Test prompt',
          simpleSchema,
          'special task'
        );

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          'special-resource-name-123',
          'Test prompt',
          true,
          { resource: 'special-resource-name-123', requireJSON: true }
        );
      });

      test('should handle correction resource name with suffix', async () => {
        const invalidResponse = { message: 123 }; // Invalid: should be string
        const validResponse = { message: 'corrected' };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidResponse)
          .mockResolvedValueOnce(validResponse);

        await llmInvoker.getStructuredResponse(
          'base-resource',
          'Test prompt',
          simpleSchema,
          'correction task'
        );

        const firstCall = mockLLMRouter.executeCompletion.mock.calls[0];
        const correctionCall = mockLLMRouter.executeCompletion.mock.calls[1];

        expect(firstCall[0]).toBe('base-resource');
        expect(correctionCall[0]).toBe('base-resource-fix');
      });
    });

    describe('performance and edge cases', () => {
      test('should handle large JSON responses', async () => {
        const largeResponse = {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
          data: 'x'.repeat(10000), // Large string
        };

        const largeSchema = z.object({
          name: z.string(),
          age: z.number(),
          email: z.string().email(),
          data: z.string(),
        });

        mockLLMRouter.executeCompletion.mockResolvedValue(largeResponse);

        const result = await llmInvoker.getStructuredResponse(
          'large-resource',
          'Generate large data',
          largeSchema,
          'large data task'
        );

        expect(result).toEqual(largeResponse);
      });

      test('should handle special characters in JSON response', async () => {
        const responseWithSpecialChars = {
          name: 'João O\'Connor "The Developer"',
          age: 30,
          email: 'joao@example.com',
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(responseWithSpecialChars);

        const result = await llmInvoker.getStructuredResponse(
          'special-chars',
          'Generate data with special characters',
          userSchema,
          'special chars task'
        );

        expect(result).toEqual(responseWithSpecialChars);
      });

      test('should handle concurrent calls', async () => {
        const responses = [
          { message: 'response 1' },
          { message: 'response 2' },
          { message: 'response 3' },
        ];

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(responses[0])
          .mockResolvedValueOnce(responses[1])
          .mockResolvedValueOnce(responses[2]);

        const promises = [
          llmInvoker.getStructuredResponse('resource-1', 'prompt 1', simpleSchema, 'task 1'),
          llmInvoker.getStructuredResponse('resource-2', 'prompt 2', simpleSchema, 'task 2'),
          llmInvoker.getStructuredResponse('resource-3', 'prompt 3', simpleSchema, 'task 3'),
        ];

        const results = await Promise.all(promises);

        expect(results).toEqual(responses);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3);
      });

      test('should handle empty string in response fields', async () => {
        const responseWithEmpty = {
          name: '',
          age: 30,
          email: 'john@example.com',
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(responseWithEmpty);

        const result = await llmInvoker.getStructuredResponse(
          'empty-string',
          'Generate data with empty string',
          userSchema,
          'empty string task'
        );

        expect(result).toEqual(responseWithEmpty);
      });
    });

    describe('error logging integration', () => {
      test('should log validation errors with proper context', async () => {
        const invalidResponse = {
          name: 'John',
          age: 'invalid',
          email: 'not-an-email',
        };

        mockLLMRouter.executeCompletion
          .mockResolvedValueOnce(invalidResponse)
          .mockResolvedValueOnce(invalidResponse); // Fails again

        await expect(
          llmInvoker.getStructuredResponse(
            'error-logging-test',
            'Generate user data',
            userSchema,
            'error logging task'
          )
        ).rejects.toThrow();

        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
          "Validation failed for 'error logging task' - attempting self-correction...",
          expect.objectContaining({
            // Validation error object should contain error details in Zod format
            _errors: expect.any(Array),
            age: expect.objectContaining({
              _errors: expect.arrayContaining([expect.stringContaining('number')])
            }),
            email: expect.objectContaining({
              _errors: expect.arrayContaining([expect.stringContaining('email')])
            }),
          })
        );
      });

      test('should not log errors on successful first attempt', async () => {
        const validResponse = {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(validResponse);

        await llmInvoker.getStructuredResponse(
          'no-error-test',
          'Generate user data',
          userSchema,
          'no error task'
        );

        expect(mockLogErrorMsgAndDetail).not.toHaveBeenCalled();
      });
    });
  });
}); 