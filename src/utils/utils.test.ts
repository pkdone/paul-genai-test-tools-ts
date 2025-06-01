import { countLines, joinArrayWithSeparators, convertArrayOfNumbersToArrayOfDoubles } from "./text-utils";
import { getFileSuffix } from "./path-utils";
import { Double } from "bson";
import { getErrorText, getErrorStack } from "./error-utils";
import { convertTextToJSON } from "./json-tools";

describe("File system utilities", () => {
  // Test data for getFileSuffix function
  const fileSuffixTestData = [
    { input: "myfile.txt", expected: "txt", description: "normal file with extension" },
    { input: "myfile.", expected: "", description: "file with trailing dot" },
    { input: "myfile", expected: "", description: "file without extension" },
  ];

  test.each(fileSuffixTestData)(
    "getFileSuffix $description",
    ({ input, expected }) => {
      expect(getFileSuffix(input)).toBe(expected);
    }
  );
});

describe("Text utilities", () => {
  describe("countLines", () => {
    test("counts lines in mixed content", () => {
      expect(countLines("\none and\n two, 40 here\n yep \t what ?\n this ")).toBe(5);
    });
  });

  describe("joinArrayWithSeparators", () => {
    test("default separators", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines)).toBe("line1\nline2\nline3");
    });

    test("custom separators", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines, ", ", "> ")).toBe("> line1, > line2, > line3");
    });

    test("empty array", () => {
      expect(joinArrayWithSeparators([])).toBe("");
    });
  });

  describe("convertArrayOfNumbersToArrayOfDoubles", () => {
    test("converts numbers to BSON Doubles", () => {
      const numbers = [1, 2.5, 3.14];
      const doubles = convertArrayOfNumbersToArrayOfDoubles(numbers);
      expect(doubles).toHaveLength(3);
      expect(doubles[0]).toBeInstanceOf(Double);
      expect(doubles[0].valueOf()).toBe(1);
      expect(doubles[1].valueOf()).toBe(2.5);
      expect(doubles[2].valueOf()).toBe(3.14);
    });
  });
});

describe("Error utilities", () => {
  describe("getErrorText", () => {
    // Test data for getErrorText function
    const errorTextTestData = [
      {
        input: new Error("Test error"),
        expected: "Error. Test error",
        description: "Error object"
      },
      {
        input: { message: "Custom error" },
        expected: "<unknown-type>. Custom error",
        description: "object containing message"
      },
      {
        input: "string error",
        expected: "<unknown-type>. \"string error\"",
        description: "primitive value"
      },
      {
        input: null,
        expected: "<unknown-type>. No error message available",
        description: "null value"
      }
    ];

    test.each(errorTextTestData)(
      "with $description",
      ({ input, expected }) => {
        expect(getErrorText(input)).toBe(expected);
      }
    );
  });

  describe("getErrorStack", () => {
    test("with Error object", () => {
      const error = new Error("Test error");
      const stack = getErrorStack(error);
      expect(stack).toContain("Error: Test error");
    });

    test("with non-Error object", () => {
      const stack = getErrorStack("not an error");
      expect(stack).toContain("Error");
    });
  });
});

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
