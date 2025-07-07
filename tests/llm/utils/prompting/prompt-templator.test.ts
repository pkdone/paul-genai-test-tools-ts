import { z } from "zod";
import {
  createPromptFromConfig,
  DynamicPromptReplaceVars,
} from "../../../../src/llm/utils/prompting/prompt-templator";

describe("prompt-utils", () => {
  describe("createPromptFromConfig", () => {
    it("should create a prompt with simple string schema", () => {
      const template =
        "Generate JSON following this schema: {{jsonSchema}}\n\nContent: {{codeContent}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.string(),
        fileContentDesc: "text file",
        instructions: "process this text",
      };
      const content = "test content";

      const result = createPromptFromConfig(template, config, content);

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "string"');
      expect(result).toContain("test content");
    });

    it("should create a prompt with object schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        fileContentDesc: "user data",
        instructions: "extract user information",
      };
      const content = "John Doe, 30 years old";

      const result = createPromptFromConfig(template, config, content);

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"name"');
      expect(result).toContain('"age"');
      expect(result).toContain("John Doe, 30 years old");
    });

    it("should handle template placeholders correctly", () => {
      const template =
        "File Type: {{fileContentDesc}}\nInstructions: {{specificInstructions}}\nSchema: {{jsonSchema}}\nCode: {{codeContent}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.object({
          value: z.string(),
        }),
        fileContentDesc: "JavaScript file",
        instructions: "analyze this code",
      };
      const content = "const x = 5;";

      const result = createPromptFromConfig(template, config, content);

      expect(result).toContain("File Type: JavaScript file");
      expect(result).toContain("Instructions: analyze this code");
      expect(result).toContain('"type": "object"');
      expect(result).toContain("const x = 5;");
    });

    it("should format JSON schema with proper indentation", () => {
      const template = "{{jsonSchema}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.object({
          nested: z.object({
            value: z.string(),
          }),
        }),
        fileContentDesc: "config file",
        instructions: "parse config",
      };
      const content = "{}";

      const result = createPromptFromConfig(template, config, content);

      // Check that the result has proper formatting (includes newlines and spaces)
      expect(result).toContain("\n");
      expect(result).toContain("  "); // Two spaces for indentation
    });

    it("should handle array schemas", () => {
      const template = "{{jsonSchema}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.array(z.string()),
        fileContentDesc: "list file",
        instructions: "extract items",
      };
      const content = "item1, item2, item3";

      const result = createPromptFromConfig(template, config, content);

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"items"');
    });

    it("should handle optional fields in object schemas", () => {
      const template = "{{jsonSchema}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        fileContentDesc: "data file",
        instructions: "extract data",
      };
      const content = "required: value1";

      const result = createPromptFromConfig(template, config, content);

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"required"');
      expect(result).toContain('"optional"'); // Optional fields appear in properties
      expect(result).toContain('[\n    "required"\n  ]'); // Only required field is in the required array
    });

    it("should handle empty content", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.string(),
        fileContentDesc: "empty file",
        instructions: "handle empty content",
      };
      const content = "";

      const result = createPromptFromConfig(template, config, content);

      expect(result).toContain('"type": "string"');
      expect(result).toContain("Content: ");
    });

    it("should handle complex nested schemas", () => {
      const template = "{{jsonSchema}}\n{{codeContent}}";
      const config: DynamicPromptReplaceVars = {
        schema: z.object({
          user: z.object({
            profile: z.object({
              settings: z.array(z.string()),
            }),
          }),
        }),
        fileContentDesc: "user profile",
        instructions: "extract user profile data",
      };
      const content = "complex nested data";

      const result = createPromptFromConfig(template, config, content);

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"user"');
      expect(result).toContain("complex nested data");
    });
  });
}); 