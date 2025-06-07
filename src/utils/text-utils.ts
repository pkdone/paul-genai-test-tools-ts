/**
 * Count the lines in a piece of text.
 */
export function countLines(text: string): number {
  return text.split("\n").length;
}

/**
 *  Merges an array of string seperated by newlines unless a different sepeator specified.
 */
export function joinArrayWithSeparators(lines: string[], suffix = "\n", prefix = ""): string {
  if (prefix === "") {
    // When no prefix is needed, we can use a simpler and more efficient approach
    return lines.join(suffix);
  } else {
    // When prefix is needed, map each line to include prefix and then join
    return lines.map(line => prefix + line).join(suffix);
  }
}

