import { z } from "zod";
import { schemaToJsonString, buildPrompt } from "../../../../src/llm/utils/prompting/prompt-utils";

describe("prompt-utils", () => {
  describe("schemaToJsonString", () => {
    it("should convert a simple string schema to JSON string", () => {
      const schema = z.string();
      const result = schemaToJsonString(schema);

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "string"');

      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });

    it("should convert an object schema to JSON string", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = schemaToJsonString(schema);

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"name"');
      expect(result).toContain('"age"');

      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });

    it("should format JSON with proper indentation", () => {
      const schema = z.object({
        nested: z.object({
          value: z.string(),
        }),
      });
      const result = schemaToJsonString(schema);

      // Check that the result has proper formatting (includes newlines and spaces)
      expect(result).toContain("\n");
      expect(result).toContain("  "); // Two spaces for indentation
    });

    it("should handle array schemas", () => {
      const schema = z.array(z.string());
      const result = schemaToJsonString(schema);

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "array"');
      expect(result).toContain('"items"');

      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });

    it("should handle optional fields", () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const result = schemaToJsonString(schema);

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"required"');
      expect(result).toContain('"optional"'); // Optional fields appear in properties
      expect(result).toContain('[\n    "required"\n  ]'); // Only required field is in the required array

      // Verify it's valid JSON
      expect(() => {
        JSON.parse(result);
      }).not.toThrow();
    });
  });

  describe("buildPrompt", () => {
    it("should build a prompt with template, schema, and content", () => {
      const template =
        "Generate JSON following this schema: {{jsonSchema}}\n\nContent: {{codeContent}}";
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const content = "test content";

      const result = buildPrompt(template, schema, content);

      expect(result).toContain("Generate JSON following this schema:");
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain("test content");
    });

    it("should handle empty content", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const schema = z.string();
      const content = "";

      const result = buildPrompt(template, schema, content);

      expect(result).toContain('"type": "string"');
      expect(result).toContain("Content: ");
    });

    it("should handle complex nested schemas", () => {
      const template = "{{jsonSchema}}\n{{codeContent}}";
      const schema = z.object({
        user: z.object({
          profile: z.object({
            settings: z.array(z.string()),
          }),
        }),
      });
      const content = "complex nested data";

      const result = buildPrompt(template, schema, content);

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain('"user"');
      expect(result).toContain("complex nested data");
    });
  });
});
