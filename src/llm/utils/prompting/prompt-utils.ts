import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";

/**
 * Helper function to convert a Zod schema to a JSON string for use in prompts
 * @param schema - The Zod schema to convert
 * @returns A formatted JSON string representation of the schema
 */
export const schemaToJsonString = (schema: z.ZodType): string => {
  return JSON.stringify(zodToJsonSchema(schema), null, 2);
};

/**
 * Generic prompt builder utility that combines a template, schema, and content
 * to create a complete prompt for LLM consumption.
 *
 * @param template - The prompt template string with placeholders
 * @param schema - The Zod schema to be serialized as JSON schema
 * @param content - The content to be inserted into the template
 * @returns The complete prompt string
 */
export function buildPrompt(template: string, schema: z.ZodType, content: string): string {
  return fillPrompt(template, {
    jsonSchema: schemaToJsonString(schema),
    codeContent: content,
  });
}
