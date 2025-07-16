import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../../llm.types";
import { getErrorText, logErrorMsg } from "../../../common/utils/error-utils";
import { BadResponseContentLLMError } from "../../errors/llm-errors.types";

/**
 * Convert text content to JSON, trimming the content to only include the JSON part and optionally
 * validate it against a Zod schema.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function convertTextToJSONAndOptionallyValidate<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  resourceName: string,
  completionOptions: LLMCompletionOptions,
): T {
  if (typeof content !== "string") {
    throw new BadResponseContentLLMError(`Generated content is not a string: ${JSON.stringify(content)}`);
  }

  // This regex finds the first '{' or '[' and matches until the corresponding '}' or ']'.
  const jsonRegex = /({[\s\S]*}|\[[\s\S]*\])/;
  const match = jsonRegex.exec(content);

  if (!match) {
    throw new BadResponseContentLLMError(`LLM response for resource '${resourceName}' doesn't contain value JSON content for text: '${content}'`);
  }

  let jsonContent: T = {} as T;

  try {
    jsonContent = JSON.parse(match[0]) as T;
  } catch (error: unknown) {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' cannot be parsed to JSON for text: '${content}' - Error: ${getErrorText(error)}`,
    );
  }

  // Validate the JSON content against a Zod schema if provided
  if (
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {    
    const validation = completionOptions.jsonSchema.safeParse(content);
    
    if (!validation.success) {
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' can be turned into JSON but doesn't validate with the supplied JSON schema - content: ${content}`
      );
    }
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
