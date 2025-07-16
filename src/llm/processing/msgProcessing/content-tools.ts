import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../../llm.types";
import { logErrorMsg } from "../../../common/utils/error-utils";

/**
 * Convert text content to JSON, trimming the content to only include the JSON part and optionally
 * validate it against a Zod schema.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function convertTextToJSONAndOptionallyValidate<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  resourceName: string,
  completionOptions?: LLMCompletionOptions,
): T {
  if (typeof content !== "string") {
    throw new Error(`Generated content is not a string: ${JSON.stringify(content)}`);
  }

  // This regex finds the first '{' or '[' and matches until the corresponding '}' or ']'.
  // It's more robust than simple indexOf/lastIndexOf.
  const jsonRegex = /({[\s\S]*}|\[[\s\S]*\])/;
  const match = jsonRegex.exec(content);

  if (!match) {
    throw new Error(`Generated content is invalid - no JSON content found for text: '${content}'`);
  }

  // Validate the content as JSON
  const jsonContent = JSON.parse(match[0]) as T;

  // Validate the JSON content against a Zod schema if provided
  if (completionOptions) {
    const validatedContent = validateSchemaIfNeededAndReturnResponse<T>(
      jsonContent as LLMGeneratedContent,
      completionOptions,
      resourceName,
    );
    
    if (validatedContent === null)
      throw new Error(
        `Generated content is JSON but not valid according to the Zod schema: ${JSON.stringify(content)}`,
      );
    return validatedContent;
  }

  return jsonContent;
}

/**
 * Validate the LLM response content against a Zod schema if provided returning null if validation
 * fails (having logged the error).
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function validateSchemaIfNeededAndReturnResponse<T>(
  content: LLMGeneratedContent | null,
  completionOptions: LLMCompletionOptions,
  resourceName: string,
): T | null {
  if (
    content &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    const validation = completionOptions.jsonSchema.safeParse(content);

    if (!validation.success) {
      const errorMessage = `Zod schema validation failed for '${resourceName}' so returning null. Validation issues: ${JSON.stringify(validation.error.issues)}`;
      logErrorMsg(errorMessage);
      return null;
    }

    return validation.data as T;
  } else {
    return content as T;
  }
}
