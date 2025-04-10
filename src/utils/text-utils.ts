import { Double } from "bson";

/**
 * Count the lines in a piece of text.
 */
export function countLines(text: string) {
  return text.split("\n").length;
}

/**
 *  Merges an array of string seperated by newlines unless a different sepeator specified.
 */
export function joinArrayWithSeparators(lines: string[], suffix = "\n", prefix = "") {
  let content = "";

  lines.forEach(line => {
    content += prefix + line + suffix;
  });

  return content;
}

/**
 * Iterates through the numbers in the array and converts each one explicitly to a BSON Double.
 */
export function convertArrayOfNumbersToArrayOfDoubles(numbers: number[]): Double[] {
  return numbers.map(number => new Double(number));
}