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
