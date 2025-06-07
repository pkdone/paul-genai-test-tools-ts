import { Double } from "bson";

/**
 * Iterates through the numbers in the array and converts each one explicitly to a BSON Double.
 */
export function convertArrayOfNumbersToArrayOfDoubles(numbers: number[]): Double[] {
  return numbers.map(number => new Double(number));
} 