import { countLines, joinArrayWithSeparators } from "./text-utils";
import { convertArrayOfNumbersToArrayOfDoubles } from "../mdb/mdb-utils";
import { Double } from "bson";

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