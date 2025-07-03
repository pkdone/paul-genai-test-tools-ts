/**
 * Prompt configuration and base instructions used across different prompt modules.
 */
export const promptConfig = {
  /**
   * Base instructions for file summary prompts
   */
  FORCE_JSON_RESPONSE_LONG: `
In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
`,
} as const;
