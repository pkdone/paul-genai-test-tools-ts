
/**
 * Convert text content to JSON, trimming the content to only include the JSON part.
 */
export function convertTextToJSON(content: string) {
  const startJSONIndex = content.indexOf("{");
  const endJSONIndex = content.lastIndexOf("}");
  if (startJSONIndex === -1 || endJSONIndex === -1) throw new Error(`Invalid input: No JSON content found for text: ${content}`);
  const trimmedContent = content.substring(startJSONIndex, endJSONIndex + 1);
  // eslint-disable-next-line no-control-regex
  const sanitizedContent = trimmedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x0A\x0D\x09]/g, " ");  // Remove control characters
  return JSON.parse(sanitizedContent) as Record<string, unknown>;
}
