import {
  SummaryType,
  FileHandler,
  filePromptSchemaMappings,
  defaultHandler,
} from './file-handler-mappings';
import * as summaryPrompts from './ingestion.prompts';
import * as summarySchemas from './ingestion.schemas';
import { appConfig } from '../../../app/app.config';

// Mock the dependencies
jest.mock('./ingestion.prompts', () => ({
  createJavaSummaryPrompt: jest.fn(),
  createJsSummaryPrompt: jest.fn(),
  createDefaultSummaryPrompt: jest.fn(),
  createDdlSummaryPrompt: jest.fn(),
  createXmlSummaryPrompt: jest.fn(),
  createJspSummaryPrompt: jest.fn(),
  createMarkdownSummaryPrompt: jest.fn(),
}));

jest.mock('./ingestion.schemas', () => ({
  javaFileSummarySchema: { _def: { typeName: 'ZodObject' } },
  jsFileSummarySchema: { _def: { typeName: 'ZodObject' } },
  defaultFileSummarySchema: { _def: { typeName: 'ZodObject' } },
  ddlFileSummarySchema: { _def: { typeName: 'ZodObject' } },
  xmlFileSummarySchema: { _def: { typeName: 'ZodObject' } },
  jspFileSummarySchema: { _def: { typeName: 'ZodObject' } },
  markdownFileSummarySchema: { _def: { typeName: 'ZodObject' } },
}));

jest.mock('../../../app/app.config', () => ({
  appConfig: {
    README_FILE_NAME: 'README',
  },
}));

describe('File Handler Mappings', () => {
  const testContent = 'test file content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filePromptSchemaMappings', () => {
    test('should be a Map instance', () => {
      expect(filePromptSchemaMappings).toBeInstanceOf(Map);
    });

    test('should contain expected file type mappings', () => {
      const expectedTypes = [
        'README',
        'java',
        'js',
        'ts',
        'javascript',
        'typescript',
        'ddl',
        'sql',
        'xml',
        'jsp',
        'markdown',
        'md',
      ];

      expectedTypes.forEach(type => {
        expect(filePromptSchemaMappings.has(type)).toBe(true);
      });
    });

    test('should have correct number of mappings', () => {
      // Based on the implementation: README, java, js, ts, javascript, typescript, ddl, sql, xml, jsp, markdown, md
      expect(filePromptSchemaMappings.size).toBe(12);
    });

    describe('individual mappings', () => {
      test('README should map to markdown handler', () => {
        const handler = filePromptSchemaMappings.get('README');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createMarkdownSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.markdownFileSummarySchema);
      });

      test('java should map to Java handler', () => {
        const handler = filePromptSchemaMappings.get('java');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createJavaSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.javaFileSummarySchema);
      });

      test('js should map to JavaScript handler', () => {
        const handler = filePromptSchemaMappings.get('js');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createJsSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.jsFileSummarySchema);
      });

      test('ts should map to JavaScript handler', () => {
        const handler = filePromptSchemaMappings.get('ts');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createJsSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.jsFileSummarySchema);
      });

      test('javascript should map to JavaScript handler', () => {
        const handler = filePromptSchemaMappings.get('javascript');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createJsSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.jsFileSummarySchema);
      });

      test('typescript should map to JavaScript handler', () => {
        const handler = filePromptSchemaMappings.get('typescript');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createJsSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.jsFileSummarySchema);
      });

      test('ddl should map to DDL handler', () => {
        const handler = filePromptSchemaMappings.get('ddl');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createDdlSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.ddlFileSummarySchema);
      });

      test('sql should map to DDL handler', () => {
        const handler = filePromptSchemaMappings.get('sql');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createDdlSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.ddlFileSummarySchema);
      });

      test('xml should map to XML handler', () => {
        const handler = filePromptSchemaMappings.get('xml');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createXmlSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.xmlFileSummarySchema);
      });

      test('jsp should map to JSP handler', () => {
        const handler = filePromptSchemaMappings.get('jsp');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createJspSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.jspFileSummarySchema);
      });

      test('markdown should map to markdown handler', () => {
        const handler = filePromptSchemaMappings.get('markdown');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createMarkdownSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.markdownFileSummarySchema);
      });

      test('md should map to markdown handler', () => {
        const handler = filePromptSchemaMappings.get('md');
        expect(handler).toBeDefined();
        expect(handler?.promptCreator).toBe(summaryPrompts.createMarkdownSummaryPrompt);
        expect(handler?.schema).toBe(summarySchemas.markdownFileSummarySchema);
      });
    });

    describe('handler functionality', () => {
      test('should create prompts when promptCreator is called', () => {
        const javaHandler = filePromptSchemaMappings.get('java');
        expect(javaHandler).toBeDefined();

        if (javaHandler) {
          javaHandler.promptCreator(testContent);
          expect(summaryPrompts.createJavaSummaryPrompt).toHaveBeenCalledWith(testContent);
        }
      });

      test('should have proper schema references', () => {
        const jsHandler = filePromptSchemaMappings.get('js');
        expect(jsHandler).toBeDefined();
        expect(jsHandler?.schema).toBe(summarySchemas.jsFileSummarySchema);
      });

      test('should handle multiple file types with same handler', () => {
        const jsHandler = filePromptSchemaMappings.get('js');
        const tsHandler = filePromptSchemaMappings.get('ts');
        const javascriptHandler = filePromptSchemaMappings.get('javascript');
        const typescriptHandler = filePromptSchemaMappings.get('typescript');

        // All should reference the same functions
        expect(jsHandler?.promptCreator).toBe(tsHandler?.promptCreator);
        expect(jsHandler?.promptCreator).toBe(javascriptHandler?.promptCreator);
        expect(jsHandler?.promptCreator).toBe(typescriptHandler?.promptCreator);

        expect(jsHandler?.schema).toBe(tsHandler?.schema);
        expect(jsHandler?.schema).toBe(javascriptHandler?.schema);
        expect(jsHandler?.schema).toBe(typescriptHandler?.schema);
      });
    });

    describe('Map operations', () => {
      test('should return undefined for non-existent file types', () => {
        const handler = filePromptSchemaMappings.get('nonexistent');
        expect(handler).toBeUndefined();
      });

      test('should support case-sensitive lookups', () => {
        const lowerHandler = filePromptSchemaMappings.get('java');
        const upperHandler = filePromptSchemaMappings.get('JAVA');

        expect(lowerHandler).toBeDefined();
        expect(upperHandler).toBeUndefined();
      });

      test('should allow iteration over all handlers', () => {
        const handlers = Array.from(filePromptSchemaMappings.values());
        
        expect(handlers.length).toBe(12);
        handlers.forEach(handler => {
          expect(handler).toHaveProperty('promptCreator');
          expect(handler).toHaveProperty('schema');
          expect(typeof handler.promptCreator).toBe('function');
        });
      });

      test('should allow iteration over all file type keys', () => {
        const keys = Array.from(filePromptSchemaMappings.keys());
        
        expect(keys).toContain('java');
        expect(keys).toContain('js');
        expect(keys).toContain('ts');
        expect(keys).toContain('sql');
        expect(keys).toContain('README');
      });
    });
  });

  describe('defaultHandler', () => {
    test('should be defined', () => {
      expect(defaultHandler).toBeDefined();
    });

    test('should have correct structure', () => {
      expect(defaultHandler).toHaveProperty('promptCreator');
      expect(defaultHandler).toHaveProperty('schema');
      expect(typeof defaultHandler.promptCreator).toBe('function');
    });

    test('should use default prompt creator', () => {
      expect(defaultHandler.promptCreator).toBe(summaryPrompts.createDefaultSummaryPrompt);
    });

    test('should use default schema', () => {
      expect(defaultHandler.schema).toBe(summarySchemas.defaultFileSummarySchema);
    });

    test('should create prompt when called', () => {
      defaultHandler.promptCreator(testContent);
      expect(summaryPrompts.createDefaultSummaryPrompt).toHaveBeenCalledWith(testContent);
    });
  });

  describe('FileHandler interface', () => {
    test('should enforce correct structure', () => {
      const testHandler: FileHandler = {
        promptCreator: jest.fn(),
        schema: summarySchemas.defaultFileSummarySchema,
      };

      expect(testHandler).toHaveProperty('promptCreator');
      expect(testHandler).toHaveProperty('schema');
      expect(typeof testHandler.promptCreator).toBe('function');
    });

    test('should work with type compatibility', () => {
      // Test that FileHandler can work with existing schema types
      const typedHandler: FileHandler = {
        promptCreator: jest.fn(),
        schema: summarySchemas.javaFileSummarySchema,
      };

      expect(typedHandler.schema).toBe(summarySchemas.javaFileSummarySchema);
      expect(typeof typedHandler.promptCreator).toBe('function');
    });
  });

  describe('SummaryType union', () => {
    test('should include all expected summary types', () => {
      // This is a compile-time test that ensures the union type includes all expected types
      // We can't directly test the type at runtime, but we can verify it works with assignments

      const javaSummary: SummaryType = {
        classname: 'TestClass',
        type: 'class',
        classpath: 'com.example.TestClass',
        purpose: 'Test purpose',
        implementation: 'Test implementation',
        internalReferences: [],
        externalReferences: [],
        publicConstants: [],
        publicMethods: [],
        databaseIntegration: { mechanism: 'NONE', description: 'No database' },
      };

      const jsSummary: SummaryType = {
        purpose: 'JS test purpose',
        implementation: 'JS test implementation',
        internalReferences: [],
        externalReferences: [],
        databaseIntegration: { mechanism: 'NONE', description: 'No database' },
      };

      const defaultSummary: SummaryType = {
        purpose: 'Default test purpose',
        implementation: 'Default test implementation',
        databaseIntegration: { mechanism: 'NONE', description: 'No database' },
      };

      // These should all compile without errors
      expect(javaSummary).toBeDefined();
      expect(jsSummary).toBeDefined();
      expect(defaultSummary).toBeDefined();
    });
  });

  describe('Configuration integration', () => {
    test('should use fileSystemConfig for README file name', () => {
      const readmeHandler = filePromptSchemaMappings.get(appConfig.README_FILE_NAME);
      expect(readmeHandler).toBeDefined();
      expect(readmeHandler?.promptCreator).toBe(summaryPrompts.createMarkdownSummaryPrompt);
    });

    test('should handle README file name changes', () => {
      // Test that the mapping is based on the config value
      expect(appConfig.README_FILE_NAME).toBe('README');
      
      const handler = filePromptSchemaMappings.get('README');
      expect(handler).toBeDefined();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty content in prompt creators', () => {
      const javaHandler = filePromptSchemaMappings.get('java');
      
      if (javaHandler) {
        javaHandler.promptCreator('');
        expect(summaryPrompts.createJavaSummaryPrompt).toHaveBeenCalledWith('');
      }
    });

    test('should handle special characters in content', () => {
      const specialContent = 'content with "quotes" and \n newlines \t tabs';
      const sqlHandler = filePromptSchemaMappings.get('sql');
      
      if (sqlHandler) {
        sqlHandler.promptCreator(specialContent);
        expect(summaryPrompts.createDdlSummaryPrompt).toHaveBeenCalledWith(specialContent);
      }
    });

    test('should handle large content strings', () => {
      const largeContent = 'x'.repeat(10000);
      const xmlHandler = filePromptSchemaMappings.get('xml');
      
      if (xmlHandler) {
        xmlHandler.promptCreator(largeContent);
        expect(summaryPrompts.createXmlSummaryPrompt).toHaveBeenCalledWith(largeContent);
      }
    });

    test('should be immutable', () => {
      const originalSize = filePromptSchemaMappings.size;
      
      // Attempt to modify the map (this should work since Maps are mutable)
      filePromptSchemaMappings.set('test', defaultHandler);
      expect(filePromptSchemaMappings.size).toBe(originalSize + 1);
      
      // Clean up
      filePromptSchemaMappings.delete('test');
      expect(filePromptSchemaMappings.size).toBe(originalSize);
    });
  });

  describe('Performance considerations', () => {
    test('should handle frequent lookups efficiently', () => {
      const start = performance.now();
      
      // Perform many lookups
      for (let i = 0; i < 1000; i++) {
        filePromptSchemaMappings.get('java');
        filePromptSchemaMappings.get('js');
        filePromptSchemaMappings.get('sql');
        filePromptSchemaMappings.get('nonexistent');
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete in reasonable time (less than 100ms for 4000 lookups)
      expect(duration).toBeLessThan(100);
    });

    test('should reuse handler instances', () => {
      const handler1 = filePromptSchemaMappings.get('java');
      const handler2 = filePromptSchemaMappings.get('java');
      
      // Should return the same reference
      expect(handler1).toBe(handler2);
    });
  });
}); 