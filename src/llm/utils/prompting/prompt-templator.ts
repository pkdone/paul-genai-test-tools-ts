import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";

/**
 * Prompt configuration and base instructions used across different prompt modules.
 */
export const promptConfig = {
  /**
   * Base instructions for file summary prompts
   */
  FORCE_JSON_RESPONSE_TEXT: `
In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
`,
} as const;

/**
 * Configuration for prompts that need file type and instructions
 */
export interface PromptConfig {
  schema: z.ZodType;
  fileContentDesc: string;
  instructions: string;
}

/**
 * Convenience function for creating prompts
 */
export function createPromptFromConfig(
  template: string,
  config: PromptConfig,
  codeContent: string,
): string {
  const processedTemplate = template
    .replace("{{fileContentDesc}}", config.fileContentDesc)
    .replace("{{specificInstructions}}", config.instructions);
  return fillPrompt(processedTemplate, {
    jsonSchema: schemaToJsonString(config.schema),
    codeContent: codeContent,
  });
}



/**
 * Helper function to convert a Zod schema to a JSON string for use in prompts
 * @param schema - The Zod schema to convert
 * @returns A formatted JSON string representation of the schema
 */
function schemaToJsonString(schema: z.ZodType): string {
  return JSON.stringify(zodToJsonSchema(schema), null, 2);
}



