import { convertTextToJSON } from "./json-tools";

// Test interfaces for generic type testing
interface TestUser {
  name: string;
  age: number;
  email: string;
}

interface TestConfig {
  enabled: boolean;
  settings: {
    timeout: number;
    retries: number;
  };
}

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
        input: "Text with escaped control chars {\"key\": \"value\\nwith\\tcontrol\\rchars\"}",
        expected: { key: "value\nwith\tcontrol\rchars" },
        description: "escaped control characters"
      },
      {
        input: "Text with newline in JSON {\"description\": \"First line.\\nSecond line.\"}",
        expected: { description: "First line.\nSecond line." },
        description: "JSON with escaped newline character"
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

    test("returns typed result with generic type parameter", () => {
      const userJson = 'Text before {"name": "John Doe", "age": 30, "email": "john@example.com"} text after';
      const user = convertTextToJSON<TestUser>(userJson);
      
      // TypeScript should now provide type safety for these properties
      expect(user.name).toBe("John Doe");
      expect(user.age).toBe(30);
      expect(user.email).toBe("john@example.com");
    });

    test("returns complex typed result with nested objects", () => {
      const configJson = 'Prefix {"enabled": true, "settings": {"timeout": 5000, "retries": 3}} suffix';
      const config = convertTextToJSON<TestConfig>(configJson);
      
      // TypeScript should provide type safety for nested properties
      expect(config.enabled).toBe(true);
      expect(config.settings.timeout).toBe(5000);
      expect(config.settings.retries).toBe(3);
    });

    test("defaults to Record<string, unknown> when no type parameter provided", () => {
      const input = "Text {\"dynamic\": \"content\", \"count\": 42} more text";
      const result = convertTextToJSON(input); // No type parameter
      
      expect(result).toEqual({ dynamic: "content", count: 42 });
      // The result should be of type Record<string, unknown>
      expect(typeof result).toBe("object");
    });
  });
}); 