import "reflect-metadata";
import { fileTypeMetataDataAndPromptTemplate } from "../../../src/features/capture/file-handler.config";
import { appConfig } from "../../../src/config/app.config";
import { SourceSummaryType } from "../../../src/schemas/source-summaries.schema";
import * as summarySchemas from "../../../src/schemas/source-summaries.schema";
import { FileHandler } from "../../../src/features/capture/file-summarizer";

jest.mock("../../../src/schemas/source-summaries.schema", () => ({
  javaFileSummarySchema: { _def: { typeName: "ZodObject" } },
  jsFileSummarySchema: { _def: { typeName: "ZodObject" } },
  defaultFileSummarySchema: { _def: { typeName: "ZodObject" } },
  ddlFileSummarySchema: { _def: { typeName: "ZodObject" } },
  xmlFileSummarySchema: { _def: { typeName: "ZodObject" } },
  jspFileSummarySchema: { _def: { typeName: "ZodObject" } },
  markdownFileSummarySchema: { _def: { typeName: "ZodObject" } },
}));

describe("File Handler Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fileTypeMetataDataAndPromptTemplate", () => {
    test("should be a Record with expected file types", () => {
      expect(typeof fileTypeMetataDataAndPromptTemplate).toBe("object");
      expect(fileTypeMetataDataAndPromptTemplate).not.toBeNull();
    });

    test("should contain expected prompt template keys", () => {
      const expectedPromptTypes = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
      ];

      expectedPromptTypes.forEach((type) => {
        expect(fileTypeMetataDataAndPromptTemplate).toHaveProperty(type);
      });
    });

    test("should have correct number of mappings", () => {
      expect(Object.keys(fileTypeMetataDataAndPromptTemplate).length).toBe(7);
    });

    test("should map prompt types to correct schemas", () => {
      expect(fileTypeMetataDataAndPromptTemplate.java.schema).toBe(
        summarySchemas.javaFileSummarySchema,
      );
      expect(fileTypeMetataDataAndPromptTemplate.javascript.schema).toBe(
        summarySchemas.jsFileSummarySchema,
      );
      expect(fileTypeMetataDataAndPromptTemplate.default.schema).toBe(
        summarySchemas.defaultFileSummarySchema,
      );
      expect(fileTypeMetataDataAndPromptTemplate.sql.schema).toBe(
        summarySchemas.ddlFileSummarySchema,
      );
      expect(fileTypeMetataDataAndPromptTemplate.xml.schema).toBe(
        summarySchemas.xmlFileSummarySchema,
      );
      expect(fileTypeMetataDataAndPromptTemplate.jsp.schema).toBe(
        summarySchemas.jspFileSummarySchema,
      );
      expect(fileTypeMetataDataAndPromptTemplate.markdown.schema).toBe(
        summarySchemas.markdownFileSummarySchema,
      );
    });

    test("should have fileContentDesc and instructions for each type", () => {
      Object.entries(fileTypeMetataDataAndPromptTemplate).forEach(([, config]) => {
        expect(config).toHaveProperty("fileContentDesc");
        expect(config).toHaveProperty("instructions");
        expect(config).toHaveProperty("schema");
        expect(typeof config.fileContentDesc).toBe("string");
        expect(typeof config.instructions).toBe("string");
      });
    });
  });

  describe("FileHandler interface", () => {
    test("should enforce correct structure", () => {
      const testHandler: FileHandler = {
        promptCreator: jest.fn(),
        schema: summarySchemas.defaultFileSummarySchema,
      };

      expect(testHandler).toHaveProperty("promptCreator");
      expect(testHandler).toHaveProperty("schema");
      expect(typeof testHandler.promptCreator).toBe("function");
    });

    test("should work with type compatibility", () => {
      // Test that FileHandler can work with existing schema types
      const typedHandler: FileHandler = {
        promptCreator: jest.fn(),
        schema: summarySchemas.javaFileSummarySchema,
      };

      expect(typedHandler.schema).toBe(summarySchemas.javaFileSummarySchema);
      expect(typeof typedHandler.promptCreator).toBe("function");
    });
  });

  describe("SummaryType union", () => {
    test("should include all expected summary types", () => {
      // This is a compile-time test that ensures the union type includes all expected types
      // We can't directly test the type at runtime, but we can verify it works with assignments

      const javaSummary: SourceSummaryType = {
        classname: "TestClass",
        classType: "class",
        classpath: "com.example.TestClass",
        purpose: "Test purpose",
        implementation: "Test implementation",
        internalReferences: [],
        externalReferences: [],
        publicConstants: [],
        publicMethods: [],
        databaseIntegration: { mechanism: "NONE", description: "No database" },
      };

      const jsSummary: SourceSummaryType = {
        purpose: "JS test purpose",
        implementation: "JS test implementation",
        internalReferences: [],
        externalReferences: [],
        databaseIntegration: { mechanism: "NONE", description: "No database" },
      };

      const defaultSummary: SourceSummaryType = {
        purpose: "Default test purpose",
        implementation: "Default test implementation",
        databaseIntegration: { mechanism: "NONE", description: "No database" },
      };

      // These should all compile without errors
      expect(javaSummary).toBeDefined();
      expect(jsSummary).toBeDefined();
      expect(defaultSummary).toBeDefined();
    });
  });

  describe("Integration between file suffix mappings and prompt templates", () => {
    test("should have corresponding prompt templates for all canonical types", () => {
      const canonicalTypes = new Set(appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.values());

      canonicalTypes.forEach((canonicalType) => {
        expect(fileTypeMetataDataAndPromptTemplate).toHaveProperty(canonicalType);
      });
    });

    test("should provide fallback to default for unknown types", () => {
      // Test that unknown suffix maps to default
      const unknownSuffix = "unknown";
      const canonicalType =
        appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.get(unknownSuffix) ?? "default";

      expect(canonicalType).toBe("default");
      expect(fileTypeMetataDataAndPromptTemplate).toHaveProperty("default");
    });
  });
});
