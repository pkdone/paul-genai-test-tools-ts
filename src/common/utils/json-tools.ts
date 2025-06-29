/**
 * Convert text content to JSON, trimming the content to only include the JSON part.
 * @param content The text content containing JSON
 * @returns The parsed JSON object with the specified type
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function convertTextToJSON<T = Record<string, unknown>>(content: string): T {
  // This regex finds the first '{' or '[' and matches until the corresponding '}' or ']'.
  // It's more robust than simple indexOf/lastIndexOf.
  const jsonRegex = /({[\s\S]*}|\[[\s\S]*\])/;
  const match = jsonRegex.exec(content);

  if (!match) {
    throw new Error(`Invalid input: No JSON content found for text: ${content}`);
  }

  const jsonString = match[0];
  return JSON.parse(jsonString) as T;
}
