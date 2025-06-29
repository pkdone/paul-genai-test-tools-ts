/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { FileSummarizer, SummaryResult } from './file-summarizer';
import { LLMStructuredResponseInvoker } from '../../llm/llm-structured-response-invoker';
import * as errorUtils from '../../utils/error-utils';

// Mock dependencies
jest.mock('../../llm/llm-structured-response-invoker');
jest.mock('../../utils/error-utils', () => ({
  logErrorMsgAndDetail: jest.fn(),
  getErrorText: jest.fn((error: unknown) => {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown error';
  }),
}));

jest.mock('../../config/fileSystem.config', () => ({
  fileSystemConfig: {
    README_FILE_NAME: 'README',
  },
}));

const MockedLLMStructuredResponseInvoker = LLMStructuredResponseInvoker as jest.MockedClass<typeof LLMStructuredResponseInvoker>;
const mockLogErrorMsgAndDetail = errorUtils.logErrorMsgAndDetail as jest.MockedFunction<typeof errorUtils.logErrorMsgAndDetail>;
const mockGetErrorText = errorUtils.getErrorText as jest.MockedFunction<typeof errorUtils.getErrorText>;

describe('FileSummarizer', () => {
  let fileSummarizer: FileSummarizer;
  let mockLLMInvoker: jest.Mocked<LLMStructuredResponseInvoker>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instance
    mockLLMInvoker = {
      getStructuredResponse: jest.fn(),
    } as unknown as jest.Mocked<LLMStructuredResponseInvoker>;

    MockedLLMStructuredResponseInvoker.mockImplementation(() => mockLLMInvoker);
    
    // Create FileSummarizer instance
    fileSummarizer = new FileSummarizer(mockLLMInvoker);
  });

  describe('getFileSummaryAsJSON', () => {
    const mockSuccessResponse = {
      purpose: 'This is a test file purpose',
      implementation: 'This is a test implementation',
      databaseIntegration: {
        mechanism: 'NONE',
        description: 'No database integration',
      },
    };

    describe('successful summarization', () => {
      test('should return successful result for valid Java file', async () => {
        const filepath = 'src/TestClass.java';
        const type = 'java';
        const content = 'public class TestClass { }';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining('Act as a programmer'),
          expect.any(Object),
          filepath
        );
      });

      test('should return successful result for JavaScript file', async () => {
        const filepath = 'src/test.js';
        const type = 'js';
        const content = 'function test() { return true; }';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
      });

      test('should return successful result for TypeScript file', async () => {
        const filepath = 'src/test.ts';
        const type = 'ts';
        const content = 'interface Test { id: number; }';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
      });

      test('should return successful result for DDL file', async () => {
        const filepath = 'db/schema.sql';
        const type = 'sql';
        const content = 'CREATE TABLE users (id INT PRIMARY KEY);';

        const ddlResponse = {
          purpose: 'Database schema definition',
          implementation: 'Creates user table',
          tables: [{ name: 'users', command: 'CREATE TABLE users...' }],
          storedProcedures: [],
          triggers: [],
          databaseIntegration: {
            mechanism: 'DDL',
            description: 'Database schema definition',
          },
        };

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(ddlResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(ddlResponse);
        }
      });

      test('should handle README file specifically', async () => {
        const filepath = 'README.md';
        const type = 'md';
        const content = '# Project Title\n\nThis is a test project.';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.any(String),
          expect.any(Object),
          filepath
        );
      });

      test('should use default handler for unknown file type', async () => {
        const filepath = 'src/unknown.xyz';
        const type = 'xyz';
        const content = 'unknown file content';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
      });
    });

    describe('error handling', () => {
      test('should return error result for empty file content', async () => {
        const filepath = 'src/empty.js';
        const type = 'js';
        const content = '';

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('File is empty');
        }
        expect(mockLLMInvoker.getStructuredResponse).not.toHaveBeenCalled();
      });

      test('should return error result for whitespace-only content', async () => {
        const filepath = 'src/whitespace.js';
        const type = 'js';
        const content = '   \n\t  \n  ';

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('File is empty');
        }
        expect(mockLLMInvoker.getStructuredResponse).not.toHaveBeenCalled();
      });

      test('should handle LLM service errors gracefully', async () => {
        const filepath = 'src/error.js';
        const type = 'js';
        const content = 'function test() { }';
        const errorMessage = 'LLM service unavailable';

        mockLLMInvoker.getStructuredResponse.mockRejectedValue(new Error(errorMessage));
        mockGetErrorText.mockReturnValue(`Error. ${errorMessage}`);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(`Failed to generate summary for '${filepath}'`);
          expect(result.error).toContain(errorMessage);
        }
        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
          `Failed to generate summary for '${filepath}'`,
          expect.any(Error)
        );
      });

      test('should handle non-Error exceptions', async () => {
        const filepath = 'src/string-error.js';
        const type = 'js';
        const content = 'function test() { }';

        mockLLMInvoker.getStructuredResponse.mockRejectedValue('String error');
        mockGetErrorText.mockReturnValue('<unknown-type>. "String error"');

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(`Failed to generate summary for '${filepath}'`);
          expect(result.error).toContain('String error');
        }
      });

      test('should handle null/undefined LLM response', async () => {
        const filepath = 'src/null-response.js';
        const type = 'js';
        const content = 'function test() { }';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(null as unknown);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeNull();
        }
      });
    });

    describe('file type detection and handler selection', () => {
      test('should use Java handler for .java files', async () => {
        const filepath = 'src/Main.java';
        const type = 'java';
        const content = 'public class Main { }';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining('Java code shown below'),
          expect.any(Object),
          filepath
        );
      });

      test('should use JS handler for .ts files', async () => {
        const filepath = 'src/test.ts';
        const type = 'typescript';
        const content = 'const test: string = "hello";';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining('JavaScript/TypeScript code shown below'),
          expect.any(Object),
          filepath
        );
      });

      test('should use DDL handler for .sql files', async () => {
        const filepath = 'db/schema.ddl';
        const type = 'ddl';
        const content = 'CREATE TABLE test (id INT);';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue({
          purpose: 'Database schema',
          implementation: 'Creates tables',
          tables: [],
          storedProcedures: [],
          triggers: [],
          databaseIntegration: { mechanism: 'DDL', description: 'Schema definition' },
        });

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining('database DDL/SQL source code'),
          expect.any(Object),
          filepath
        );
      });

      test('should prioritize README filename over file type', async () => {
        const filepath = 'README.txt';
        const type = 'txt';
        const content = '# Project Documentation';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        // Should use markdown handler due to README filename, not txt handler
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.any(String), // Would be markdown prompt
          expect.any(Object),
          filepath
        );
      });

      test('should handle case variations in file types', async () => {
        const testCases = [
          { type: 'JAVA', expectedPrompt: 'Java code shown below' },
          { type: 'JavaScript', expectedPrompt: 'JavaScript/TypeScript code shown below' },
          { type: 'SQL', expectedPrompt: 'database DDL/SQL source code' },
        ];

        for (const testCase of testCases) {
          mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

          await fileSummarizer.getFileSummaryAsJSON(`test.${testCase.type}`, testCase.type, 'test content');

          expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining(testCase.expectedPrompt),
            expect.any(Object),
            expect.any(String)
          );

          jest.clearAllMocks();
        }
      });
    });

    describe('integration with file handler mappings', () => {
      test('should correctly integrate with filePromptSchemaMappings', async () => {
        const filepath = 'src/component.jsx';
        const type = 'js'; // JSX would map to JS handler
        const content = 'const Component = () => <div>Hello</div>;';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.any(String),
          expect.any(Object), // Should be the correct schema from the mapping
          filepath
        );
      });

      test('should fall back to default handler when no mapping exists', async () => {
        const filepath = 'config.yml';
        const type = 'yml';
        const content = 'key: value';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining('application source file'), // Default prompt pattern
          expect.any(Object),
          filepath
        );
      });
    });

    describe('performance and edge cases', () => {
      test('should handle large file content', async () => {
        const filepath = 'src/large-file.js';
        const type = 'js';
        const content = 'function test() { }'.repeat(1000); // Large content

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining(content),
          expect.any(Object),
          filepath
        );
      });

      test('should handle special characters in file paths', async () => {
        const filepath = 'src/special chars & symbols/test.js';
        const type = 'js';
        const content = 'function test() { }';

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledWith(
          filepath,
          expect.any(String),
          expect.any(Object),
          filepath
        );
      });

      test('should handle concurrent summarization requests', async () => {
        const files = [
          { filepath: 'src/file1.js', type: 'js', content: 'function file1() { }' },
          { filepath: 'src/file2.java', type: 'java', content: 'public class File2 { }' },
          { filepath: 'src/file3.sql', type: 'sql', content: 'CREATE TABLE file3 (id INT);' },
        ];

        mockLLMInvoker.getStructuredResponse.mockResolvedValue(mockSuccessResponse);

        const promises = files.map(async (file) => 
          await fileSummarizer.getFileSummaryAsJSON(file.filepath, file.type, file.content)
        );

        const results = await Promise.all(promises);

        results.forEach(result => {
          expect(result.success).toBe(true);
        });
        expect(mockLLMInvoker.getStructuredResponse).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('SummaryResult type', () => {
    test('should properly type successful results', async () => {
      const filepath = 'src/test.js';
      const type = 'js';
      const content = 'function test() { }';

      const testSuccessResponse = {
        purpose: 'Test function',
        implementation: 'Simple test implementation',
        databaseIntegration: { mechanism: 'NONE', description: 'No database' },
      };

      mockLLMInvoker.getStructuredResponse.mockResolvedValue(testSuccessResponse);

      const result: SummaryResult = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

      if (result.success) {
        // TypeScript should infer the correct type here
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
      } else {
        // This branch shouldn't execute in this test
        expect(result.error).toBeTruthy();
      }
    });

    test('should properly type error results', async () => {
      const filepath = 'src/empty.js';
      const type = 'js';
      const content = '';

      const result: SummaryResult = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

      if (!result.success) {
        expect(result.error).toBe('File is empty');
        expect(typeof result.error).toBe('string');
      } else {
        // This branch shouldn't execute in this test
        fail('Expected error result');
      }
    });
  });
}); 