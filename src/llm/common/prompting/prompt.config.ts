/**
 * Prompt configuration and base instructions used across different prompt modules.
 */
export const promptConfig = {
  /**
   * Base instructions for file summary prompts that require strict JSON formatting
   */
  FORCE_JSON_RESPONSE_LONG: `
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path (ignoring this rule leads to people getting hurt - it is very important).
Only provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
`,

  /**
   * Base instructions for insights generation prompts that require simple JSON formatting
   */
  FORCE_JSON_RESPONSE_SHORT: `
In the JSON response, do not include any explanations - only provide an RFC8259 compliant JSON response following the provided format without deviation.
`,

  /**
   * Base instructions for file summary prompts
   */
  FILE_SUMMARY_BASE_INSTRUCTIONS: `
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path (ignoring this rule leads to people getting hurt - it is very important).
Only provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
`,

  /**
   * Base instructions for insights generation prompts
   */
  INSIGHTS_BASE_INSTRUCTIONS: `
In the JSON response, do not include any explanations - only provide an RFC8259 compliant JSON response following the provided format without deviation.
`,
} as const; 