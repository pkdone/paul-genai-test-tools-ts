import { convertTextToJSON } from "./json-tools";

describe("JSON utilities", () => {
  describe("convertTextToJSON", () => {
    // Test data for convertTextToJSON function
    const validJsonTestData = [
      {
        input: "Some text before {\"key\": \"value\"} some text after",
        expected: { key: "value" },
        description: "valid JSON"
      },
      {
        input: "Prefix {\"outer\": {\"inner\": 123}} suffix",
        expected: { outer: { inner: 123 } },
        description: "nested JSON"
      },
      {
        input: "{\"key\": \"value\u0000with\u0007control\u001Fchars\"}",
        expected: { key: "value with control chars" },
        description: "control characters"
      }
    ];

    test.each(validJsonTestData)(
      "with $description",
      ({ input, expected }) => {
        const result = convertTextToJSON(input);
        expect(result).toEqual(expected);
      }
    );

    test("throws on invalid JSON", () => {
      const text = "No JSON here";
      expect(() => convertTextToJSON(text)).toThrow("Invalid input: No JSON content found");
    });
  });
}); 