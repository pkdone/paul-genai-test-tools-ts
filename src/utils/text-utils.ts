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
  if (prefix === "") {
    // When no prefix is needed, we can use a simpler and more efficient approach
    return lines.join(suffix);
  } else {
    // When prefix is needed, map each line to include prefix and then join
    return lines.map(line => prefix + line).join(suffix);
  }
}

/**
 * Iterates through the numbers in the array and converts each one explicitly to a BSON Double.
 */
export function convertArrayOfNumbersToArrayOfDoubles(numbers: number[]): Double[] {
  return numbers.map(number => new Double(number));
}