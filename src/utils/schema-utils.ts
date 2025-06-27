import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Helper function to convert a Zod schema to a JSON string for use in prompts
 * @param schema - The Zod schema to convert
 * @returns A formatted JSON string representation of the schema
 */
export const schemaToJsonString = (schema: z.ZodType): string => {
  return JSON.stringify(zodToJsonSchema(schema), null, 2);
}; 