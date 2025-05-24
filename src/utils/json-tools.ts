
/**
 * Convert text content to JSON, trimming the content to only include the JSON part.
 */
export function convertTextToJSON(content: string) {
  const startJSONIndex = content.indexOf("{");
  const endJSONIndex = content.lastIndexOf("}");
  if (startJSONIndex === -1 || endJSONIndex === -1) throw new Error(`Invalid input: No JSON content found for text: ${content}`);
  const trimmedContent = content.substring(startJSONIndex, endJSONIndex + 1);
  const sanitizedContent = trimmedContent.replace(/\p{Cc}/gu, " "); // Remove control characters
  return JSON.parse(sanitizedContent) as Record<string, unknown>;
}
