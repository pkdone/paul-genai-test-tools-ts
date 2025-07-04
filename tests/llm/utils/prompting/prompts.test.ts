import { createSummaryPrompt } from "../../../../src/features/capture/ingestion.prompts";
import * as promptTemplator from "../../../../src/llm/utils/prompting/prompt-templator";

// Mock the dependency
jest.mock("../../../../src/llm/utils/prompting/prompt-templator", () => ({
  createPromptFromConfig: jest.fn(),
  promptConfig: {
    FORCE_JSON_RESPONSE_TEXT: `
In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
`,
  },
}));

describe("Prompts", () => {
  const testCodeContent = `
    public class TestClass {
        public void testMethod() {
            System.out.println("Hello World");
        }
    }
  `;

  const baseInstructionsCheck = [
    "NEVER ever respond with XML",
    "NEVER use Markdown code blocks",
    "RFC8259 compliant JSON response",
    "strictly follows the provided JSON schema",
  ];

  beforeEach(() => {
    // Reset mocks before each test
    (promptTemplator.createPromptFromConfig as jest.Mock).mockClear();

    // Mock implementation
    (promptTemplator.createPromptFromConfig as jest.Mock).mockImplementation(
      (
        template: string,
        config: promptTemplator.PromptConfig,
        code: string,
      ) => {
        let processedTemplate = template;
        processedTemplate = processedTemplate.replace("{{fileContentDesc}}", config.fileContentDesc);
        processedTemplate = processedTemplate.replace(
          "{{specificInstructions}}",
          config.instructions,
        );
        processedTemplate = processedTemplate.replace(
          "{{jsonSchema}}",
          JSON.stringify({ mocked: "schema", type: "unknown" }, null, 2),
        );
        processedTemplate = processedTemplate.replace("{{codeContent}}", code);
        return processedTemplate;
      },
    );
  });

  describe("createSummaryPrompt with java type", () => {
    test("should create Java summary prompt with correct structure", () => {
      const result = createSummaryPrompt("java", testCodeContent);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("Java code shown below");
      expect(result).toContain("name of the main public class/interface");
      expect(result).toContain("classpath");
      expect(result).toContain("database integration");
      expect(result).toContain(testCodeContent);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });

      // Check for specific Java requirements
      expect(result).toContain(
        "A very detailed definition of its purpose",
      );
      expect(result).toContain("internal references to classpaths");
      expect(result).toContain("public constants");
      expect(result).toContain("public methods");
      expect(result).toContain("JDBC");
      expect(result).toContain("Spring Data");
      expect(result).toContain("Enterprise Java Bean");
    });

    test("should handle empty code content", () => {
      const result = createSummaryPrompt("java", "");
      expect(result).toContain("CODE:\n");
      expect(result).toContain("mocked");
    });

    test("should handle special characters in code content", () => {
      const specialCodeContent = 'class Test { String s = "quotes \\"nested\\" here"; }';
      const result = createSummaryPrompt("java", specialCodeContent);
      expect(result).toContain(specialCodeContent);
    });
  });

  describe("createSummaryPrompt with js type", () => {
    test("should create JavaScript/TypeScript summary prompt with correct structure", () => {
      const result = createSummaryPrompt("js", testCodeContent);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("JavaScript/TypeScript code shown below");
      expect(result).toContain("internal references to other modules");
      expect(result).toContain("require");
      expect(result).toContain("import");
      expect(result).toContain("external references to other external modules");
      expect(result).toContain(testCodeContent);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });

      // Check for specific JS/TS requirements
      expect(result).toContain(
        "A very detailed definition of its purpose",
      );
      expect(result).toContain(
        "A very detailed definition of its implementation",
      );
      expect(result).toContain("direct database integration via a driver/library/API");
    });

    test("should handle multiline code content", () => {
      const multilineCode = `function test() {
        console.log("line 1");
        console.log("line 2");
      }`;
      const result = createSummaryPrompt("js", multilineCode);
      expect(result).toContain(multilineCode);
    });
  });

  describe("createSummaryPrompt with default type", () => {
    test("should create default summary prompt with correct structure", () => {
      const result = createSummaryPrompt("default", testCodeContent);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("project file content shown below");
      expect(result).toContain(
        "A detailed definition of its purpose",
      );
      expect(result).toContain(
        "A detailed definition of its implementation",
      );
      expect(result).toContain("direct database integration");
      expect(result).toContain(testCodeContent);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });
    });

    test("should handle null or undefined code content gracefully", () => {
      // TypeScript would prevent this, but testing runtime behavior
      const result = createSummaryPrompt("default", "null");
      expect(result).toContain("CODE:\nnull");
    });
  });

  describe("createSummaryPrompt with ddl type", () => {
    test("should create DDL summary prompt with correct structure", () => {
      const ddlCode = "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));";
      const result = createSummaryPrompt("ddl", ddlCode);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("database DDL/SQL code shown below");
      expect(result).toContain("list of the tables");
      expect(result).toContain("stored procedure");
      expect(result).toContain("triggers");
      expect(result).toContain("complexity score");
      expect(result).toContain("LOW");
      expect(result).toContain("MEDIUM");
      expect(result).toContain("HIGH");
      expect(result).toContain(ddlCode);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });

      // Check for specific DDL requirements
      expect(result).toContain(
        "detailed definition of its purpose",
      );
      expect(result).toContain(
        "detailed definition of its implementation",
      );
      expect(result).toContain("DDL");
      expect(result).toContain("DML");
      expect(result).toContain("SQL");
      expect(result).toContain("STORED-PROCEDURE");
      expect(result).toContain("TRIGGER");
    });

    test("should handle complex DDL with stored procedures", () => {
      const complexDdl = `
        CREATE TABLE orders (id INT, customer_id INT);
        CREATE PROCEDURE GetCustomerOrders(IN cust_id INT) 
        BEGIN 
          SELECT * FROM orders WHERE customer_id = cust_id; 
        END;
      `;
      const result = createSummaryPrompt("ddl", complexDdl);
      expect(result).toContain(complexDdl);
      expect(result).toContain("stored procedure");
    });
  });

  describe("createSummaryPrompt with xml type", () => {
    test("should create XML summary prompt with correct structure", () => {
      const xmlCode = "<configuration><database>mysql</database></configuration>";
      const result = createSummaryPrompt("xml", xmlCode);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("XML code shown below");
      expect(result).toContain(xmlCode);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });
    });

    test("should handle malformed XML", () => {
      const malformedXml = "<config><unclosed>";
      const result = createSummaryPrompt("xml", malformedXml);
      expect(result).toContain(malformedXml);
    });
  });

  describe("createSummaryPrompt with jsp type", () => {
    test("should create JSP summary prompt with correct structure", () => {
      const jspCode = '<%@ page language="java" %><html><body>Hello World</body></html>';
      const result = createSummaryPrompt("jsp", jspCode);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("JSP code shown below");
      expect(result).toContain(jspCode);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });
    });

    test("should handle JSP with mixed content", () => {
      const mixedJsp =
        '<%@ page import="java.util.*" %><% int count = 10; %><p>Count: <%= count %></p>';
      const result = createSummaryPrompt("jsp", mixedJsp);
      expect(result).toContain(mixedJsp);
    });
  });

  describe("createSummaryPrompt with markdown type", () => {
    test("should create Markdown summary prompt with correct structure", () => {
      const markdownCode =
        "# Title\n\nThis is a **markdown** document with [links](http://example.com).";
      const result = createSummaryPrompt("markdown", markdownCode);

      expect(result).toContain("Act as a programmer");
      expect(result).toContain("Markdown content shown below");
      expect(result).toContain(markdownCode);

      // Check for base instructions
      baseInstructionsCheck.forEach((instruction) => {
        expect(result).toContain(instruction);
      });
    });

    test("should handle markdown with code blocks", () => {
      const markdownWithCode =
        "# Documentation\n\n```javascript\nfunction test() { return true; }\n```";
      const result = createSummaryPrompt("markdown", markdownWithCode);
      expect(result).toContain(markdownWithCode);
    });

    test("should handle empty markdown content", () => {
      const result = createSummaryPrompt("markdown", "");
      expect(result).toContain("CODE:\n");
    });
  });

  describe("Prompt template consistency", () => {
    test("all prompts should contain base instructions", () => {
      const testContent = "test content";
      const prompts = [
        createSummaryPrompt("java", testContent),
        createSummaryPrompt("js", testContent),
        createSummaryPrompt("default", testContent),
        createSummaryPrompt("ddl", testContent),
        createSummaryPrompt("xml", testContent),
        createSummaryPrompt("jsp", testContent),
        createSummaryPrompt("markdown", testContent),
      ];

      prompts.forEach((prompt) => {
        baseInstructionsCheck.forEach((instruction) => {
          expect(prompt).toContain(instruction);
        });
        expect(prompt).toContain("CODE:");
        expect(prompt).toContain(testContent);
      });
    });

    test("all prompts should contain JSON schema placeholder", () => {
      const testContent = "test content";
      const prompts = [
        createSummaryPrompt("java", testContent),
        createSummaryPrompt("js", testContent),
        createSummaryPrompt("default", testContent),
        createSummaryPrompt("ddl", testContent),
        createSummaryPrompt("xml", testContent),
        createSummaryPrompt("jsp", testContent),
        createSummaryPrompt("markdown", testContent),
      ];

      prompts.forEach((prompt) => {
        expect(prompt).toContain("mocked");
        expect(prompt).toContain("schema");
      });
    });
  });

  describe("Edge cases and error handling", () => {
    test("should handle very long code content", () => {
      const longCode = "x".repeat(10000);
      const result = createSummaryPrompt("java", longCode);
      expect(result).toContain(longCode);
    });

    test("should handle code content with special JSON characters", () => {
      const specialChars = 'class Test { String json = "{\\"key\\": \\"value\\"}"; }';
      const result = createSummaryPrompt("js", specialChars);
      expect(result).toContain(specialChars);
    });

    test("should handle code content with newlines and tabs", () => {
      const formattedCode = 'function test() {\n\treturn {\n\t\tkey: "value"\n\t};\n}';
      const result = createSummaryPrompt("default", formattedCode);
      expect(result).toContain(formattedCode);
    });
  });
});
