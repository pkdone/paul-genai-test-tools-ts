/**
 * Convert text content to JSON, trimming the content to only include the JSON part.
 * @param content The text content containing JSON
 * @returns The parsed JSON object with the specified type
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function convertTextToJSON<T = Record<string, unknown>>(content: string): T {
  const startJSONIndex = content.indexOf("{");
  const endJSONIndex = content.lastIndexOf("}");
  if (startJSONIndex === -1 || endJSONIndex === -1) throw new Error(`Invalid input: No JSON content found for text: ${content}`);
  const trimmedContent = content.substring(startJSONIndex, endJSONIndex + 1);
  const sanitizedContent = trimmedContent.replace(/\p{Cc}/gu, " "); // Remove control characters
  return JSON.parse(sanitizedContent) as T;
}
