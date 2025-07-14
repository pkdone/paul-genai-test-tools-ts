import { LLMOutputFormat } from "../../../../src/llm/llm.types";
import {
  convertTextToJSONAndOptionallyValidate,
  validateSchemaIfNeededAndReturnResponse,
} from "../../../../src/llm/processing/msgProcessing/content-tools";

describe("content-tools", () => {
  // Note: extractTokensAmountFromMetadataDefaultingMissingValues and
  // postProcessAsJSONIfNeededGeneratingNewResult have been moved to AbstractLLM
  // as protected methods and are now tested in tests/llm/core/abstract-llm.test.ts

  describe("convertTextToJSONAndOptionallyValidate", () => {
    test("should convert valid JSON string to object", () => {
      const jsonString = '{"key": "value", "number": 42}';
      const result = convertTextToJSONAndOptionallyValidate(jsonString);

      expect(result).toEqual({ key: "value", number: 42 });
    });

    test("should handle JSON with surrounding text", () => {
      const textWithJson = 'Some text before {"key": "value"} some text after';
      const result = convertTextToJSONAndOptionallyValidate(textWithJson);

      expect(result).toEqual({ key: "value" });
    });

    test("should handle array JSON", () => {
      const arrayJson = '[{"item": 1}, {"item": 2}]';
      const result = convertTextToJSONAndOptionallyValidate(arrayJson);

      expect(result).toEqual([{ item: 1 }, { item: 2 }]);
    });

    test("should throw error for invalid JSON", () => {
      const invalidJson = "not valid json";

      expect(() => convertTextToJSONAndOptionallyValidate(invalidJson)).toThrow(
        "Generated content is invalid - no JSON content found",
      );
    });

    test("should throw error for non-string input", () => {
      const nonStringInput = 123;

      expect(() =>
        convertTextToJSONAndOptionallyValidate(nonStringInput as unknown as string),
      ).toThrow("Generated content is not a string");
    });
  });

  describe("validateSchemaIfNeededAndReturnResponse", () => {
    test("should return content when no schema validation needed", () => {
      const content = { key: "value" };
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = validateSchemaIfNeededAndReturnResponse(content, options);

      expect(result).toEqual(content);
    });

    test("should return null for null content", () => {
      const content = null;
      const options = { outputFormat: LLMOutputFormat.JSON };

      const result = validateSchemaIfNeededAndReturnResponse(content, options);

      expect(result).toBeNull();
    });
  });
});
