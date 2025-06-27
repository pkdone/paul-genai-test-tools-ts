import {
  createJavaSummaryPrompt,
  createJsSummaryPrompt,
  createDefaultSummaryPrompt,
  createDdlSummaryPrompt,
  createXmlSummaryPrompt,
  createJspSummaryPrompt,
  createMarkdownSummaryPrompt,
} from './prompts';

// Mock the dependencies
jest.mock('type-safe-prompt', () => ({
  fillPrompt: jest.fn((template: string, variables: Record<string, string>) => {
    // Simple mock implementation that replaces {{variable}} with values
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  }),
}));

jest.mock('../utils/schema-utils', () => ({
  schemaToJsonString: jest.fn(() => JSON.stringify({ mocked: 'schema', type: 'unknown' }, null, 2)),
}));

describe('Prompts', () => {
  const testCodeContent = `
    public class TestClass {
        public void testMethod() {
            System.out.println("Hello World");
        }
    }
  `;

  const baseInstructionsCheck = [
    'NEVER ever respond with XML',
    'NEVER use Markdown code blocks',
    'RFC8259 compliant JSON response',
    'strictly follows the provided JSON schema'
  ];

  describe('createJavaSummaryPrompt', () => {
    test('should create Java summary prompt with correct structure', () => {
      const result = createJavaSummaryPrompt(testCodeContent);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('Java code shown below');
      expect(result).toContain('name of the main public class/interface');
      expect(result).toContain('classpath');
      expect(result).toContain('database integration');
      expect(result).toContain(testCodeContent);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });

      // Check for specific Java requirements
      expect(result).toContain('very detailed definition of its purpose (you must write at least 6 sentences');
      expect(result).toContain('internal references to classpaths');
      expect(result).toContain('public constants');
      expect(result).toContain('public methods');
      expect(result).toContain('JDBC');
      expect(result).toContain('Spring Data');
      expect(result).toContain('Enterprise Java Bean');
    });

    test('should handle empty code content', () => {
      const result = createJavaSummaryPrompt('');
      expect(result).toContain('CODE:\n');
      expect(result).toContain('mocked');
    });

    test('should handle special characters in code content', () => {
      const specialCodeContent = 'class Test { String s = "quotes \\"nested\\" here"; }';
      const result = createJavaSummaryPrompt(specialCodeContent);
      expect(result).toContain(specialCodeContent);
    });
  });

  describe('createJsSummaryPrompt', () => {
    test('should create JavaScript/TypeScript summary prompt with correct structure', () => {
      const result = createJsSummaryPrompt(testCodeContent);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('JavaScript/TypeScript code shown below');
      expect(result).toContain('internal references to other modules');
      expect(result).toContain('require');
      expect(result).toContain('import');
      expect(result).toContain('external references to other external modules');
      expect(result).toContain(testCodeContent);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });

      // Check for specific JS/TS requirements
      expect(result).toContain('very detailed definition of its purpose (you must write at least 6 sentences');
      expect(result).toContain('very detailed definition of its implementation (you must write at least 6 sentences');
      expect(result).toContain('direct database integration via a driver/library/API');
    });

    test('should handle multiline code content', () => {
      const multilineCode = `function test() {
        console.log("line 1");
        console.log("line 2");
      }`;
      const result = createJsSummaryPrompt(multilineCode);
      expect(result).toContain(multilineCode);
    });
  });

  describe('createDefaultSummaryPrompt', () => {
    test('should create default summary prompt with correct structure', () => {
      const result = createDefaultSummaryPrompt(testCodeContent);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('application source file');
      expect(result).toContain('detailed definition of its purpose (you must write at least 4 sentences');
      expect(result).toContain('detailed definition of its implementation (you must write at least 3 sentences');
      expect(result).toContain('direct database integration');
      expect(result).toContain(testCodeContent);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });
    });

    test('should handle null or undefined code content gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const result = createDefaultSummaryPrompt('null');
      expect(result).toContain('CODE:\nnull');
    });
  });

  describe('createDdlSummaryPrompt', () => {
    test('should create DDL summary prompt with correct structure', () => {
      const ddlCode = 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));';
      const result = createDdlSummaryPrompt(ddlCode);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('database DDL/SQL source code');
      expect(result).toContain('list of the tables');
      expect(result).toContain('stored procedure');
      expect(result).toContain('triggers');
      expect(result).toContain('complexity score');
      expect(result).toContain('LOW');
      expect(result).toContain('MEDIUM');
      expect(result).toContain('HIGH');
      expect(result).toContain(ddlCode);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });

      // Check for specific DDL requirements
      expect(result).toContain('detailed definition of its purpose (you must write at least 2 sentences');
      expect(result).toContain('detailed definition of its implementation (you must write at least 2 sentences');
      expect(result).toContain('DDL');
      expect(result).toContain('DML');
      expect(result).toContain('SQL');
      expect(result).toContain('STORED-PROCEDURE');
      expect(result).toContain('TRIGGER');
    });

    test('should handle complex DDL with stored procedures', () => {
      const complexDdl = `
        CREATE TABLE orders (id INT, customer_id INT);
        CREATE PROCEDURE GetCustomerOrders(IN cust_id INT) 
        BEGIN 
          SELECT * FROM orders WHERE customer_id = cust_id; 
        END;
      `;
      const result = createDdlSummaryPrompt(complexDdl);
      expect(result).toContain(complexDdl);
      expect(result).toContain('stored procedure');
    });
  });

  describe('createXmlSummaryPrompt', () => {
    test('should create XML summary prompt with correct structure', () => {
      const xmlCode = '<configuration><database>mysql</database></configuration>';
      const result = createXmlSummaryPrompt(xmlCode);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('source code');
      expect(result).toContain(xmlCode);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });
    });

    test('should handle malformed XML', () => {
      const malformedXml = '<config><unclosed>';
      const result = createXmlSummaryPrompt(malformedXml);
      expect(result).toContain(malformedXml);
    });
  });

  describe('createJspSummaryPrompt', () => {
    test('should create JSP summary prompt with correct structure', () => {
      const jspCode = '<%@ page language="java" %><html><body>Hello World</body></html>';
      const result = createJspSummaryPrompt(jspCode);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('source code');
      expect(result).toContain(jspCode);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });
    });

    test('should handle JSP with mixed content', () => {
      const mixedJsp = '<%@ page import="java.util.*" %><% int count = 10; %><p>Count: <%= count %></p>';
      const result = createJspSummaryPrompt(mixedJsp);
      expect(result).toContain(mixedJsp);
    });
  });

  describe('createMarkdownSummaryPrompt', () => {
    test('should create Markdown summary prompt with correct structure', () => {
      const markdownCode = '# Title\n\nThis is a **markdown** document with [links](http://example.com).';
      const result = createMarkdownSummaryPrompt(markdownCode);

      expect(result).toContain('Act as a programmer');
      expect(result).toContain('source code');
      expect(result).toContain(markdownCode);

      // Check for base instructions
      baseInstructionsCheck.forEach(instruction => {
        expect(result).toContain(instruction);
      });
    });

    test('should handle markdown with code blocks', () => {
      const markdownWithCode = '# Documentation\n\n```javascript\nfunction test() { return true; }\n```';
      const result = createMarkdownSummaryPrompt(markdownWithCode);
      expect(result).toContain(markdownWithCode);
    });

    test('should handle empty markdown content', () => {
      const result = createMarkdownSummaryPrompt('');
      expect(result).toContain('CODE:\n');
    });
  });

  describe('Prompt template consistency', () => {
    test('all prompts should contain base instructions', () => {
      const testContent = 'test content';
      const prompts = [
        createJavaSummaryPrompt(testContent),
        createJsSummaryPrompt(testContent),
        createDefaultSummaryPrompt(testContent),
        createDdlSummaryPrompt(testContent),
        createXmlSummaryPrompt(testContent),
        createJspSummaryPrompt(testContent),
        createMarkdownSummaryPrompt(testContent),
      ];

      prompts.forEach((prompt) => {
        baseInstructionsCheck.forEach(instruction => {
          expect(prompt).toContain(instruction);
        });
        expect(prompt).toContain('CODE:');
        expect(prompt).toContain(testContent);
      });
    });

    test('all prompts should contain JSON schema placeholder', () => {
      const testContent = 'test content';
      const prompts = [
        createJavaSummaryPrompt(testContent),
        createJsSummaryPrompt(testContent),
        createDefaultSummaryPrompt(testContent),
        createDdlSummaryPrompt(testContent),
        createXmlSummaryPrompt(testContent),
        createJspSummaryPrompt(testContent),
        createMarkdownSummaryPrompt(testContent),
      ];

      prompts.forEach(prompt => {
        expect(prompt).toContain('mocked');
        expect(prompt).toContain('schema');
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle very long code content', () => {
      const longCode = 'x'.repeat(10000);
      const result = createJavaSummaryPrompt(longCode);
      expect(result).toContain(longCode);
    });

    test('should handle code content with special JSON characters', () => {
      const specialChars = 'class Test { String json = "{\\"key\\": \\"value\\"}"; }';
      const result = createJsSummaryPrompt(specialChars);
      expect(result).toContain(specialChars);
    });

    test('should handle code content with newlines and tabs', () => {
      const formattedCode = 'function test() {\n\treturn {\n\t\tkey: "value"\n\t};\n}';
      const result = createDefaultSummaryPrompt(formattedCode);
      expect(result).toContain(formattedCode);
    });
  });
}); 