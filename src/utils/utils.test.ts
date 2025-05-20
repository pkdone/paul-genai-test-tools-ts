import { countLines, joinArrayWithSeparators, convertArrayOfNumbersToArrayOfDoubles } from "./text-utils";
import { getFileSuffix } from "./path-utils";
import { Double } from "bson";
import { getErrorText, getErrorStack } from "./error-utils";
import { convertTextToJSON } from "./json-tools";

describe("File system utilities", () => {
  test("getFileSuffix normal", () => {
    expect(getFileSuffix("myfile.txt")).toBe("txt");
  });

  test("getFileSuffix no sufix", () => {
    expect(getFileSuffix("myfile.")).toBe("");
  });

  test("getFileSuffix just dot", () => {
    expect(getFileSuffix("myfile")).toBe("");
  });
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
    test("with Error object", () => {
      const error = new Error("Test error");
      expect(getErrorText(error)).toBe("Error. Test error");
    });

    test("with object containing message", () => {
      const error = { message: "Custom error" };
      expect(getErrorText(error)).toBe("<unknown-type>. Custom error");
    });

    test("with primitive value", () => {
      expect(getErrorText("string error")).toBe("<unknown-type>. \"string error\"");
    });

    test("with null", () => {
      expect(getErrorText(null)).toBe("<unknown-type>. No error message available");
    });
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
    test("with valid JSON", () => {
      const text = "Some text before {\"key\": \"value\"} some text after";
      const result = convertTextToJSON(text);
      expect(result).toEqual({ key: "value" });
    });

    test("with nested JSON", () => {
      const text = "Prefix {\"outer\": {\"inner\": 123}} suffix";
      const result = convertTextToJSON(text);
      expect(result).toEqual({ outer: { inner: 123 } });
    });

    test("with control characters", () => {
      const text = "{\"key\": \"value\u0000with\u0007control\u001Fchars\"}";
      const result = convertTextToJSON(text);
      expect(result).toEqual({ key: "value with control chars" });
    });

    test("throws on invalid JSON", () => {
      const text = "No JSON here";
      expect(() => convertTextToJSON(text)).toThrow("Invalid input: No JSON content found");
    });
  });
});
