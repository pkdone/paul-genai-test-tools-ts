import {
  LLMPurpose,
  LLMResponseTokensUsage,
  LLMFunctionResponse,
  LLMGeneratedContent,
  LLMResponseStatus,
  LLMContext,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
} from "../../llm.types";
import { BadResponseContentLLMError } from "../../errors/llm-errors.types";
import { getErrorText, logErrorMsg } from "../../../common/utils/error-utils";

/**
 * Extract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(
  modelKey: string,
  tokenUsage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  let { promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
  if (completionTokens < 0) completionTokens = 0;
  if (maxTotalTokens < 0) maxTotalTokens = modelsMetadata[modelKey].maxTotalTokens;
  if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens + 1);
  return { promptTokens, completionTokens, maxTotalTokens };
}

/**
 * Post-process the LLM response, converting it to JSON if necessary, and build the
 * response metadaat object.
 */
export function postProcessAsJSONIfNeededGeneratingNewResult(
  skeletonResult: LLMFunctionResponse,
  modelKey: string,
  taskType: LLMPurpose,
  responseContent: LLMGeneratedContent,
  asJson: boolean,
  context: LLMContext,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  logProcessingWarning = false,
): LLMFunctionResponse {
  if (taskType === LLMPurpose.COMPLETIONS) {
    try {
      if (typeof responseContent !== "string")
        throw new BadResponseContentLLMError("Generated content is not a string", responseContent);
      const generatedContent = asJson ? convertTextToJSON(responseContent) : responseContent;
      return {
        ...skeletonResult,
        status: LLMResponseStatus.COMPLETED,
        generated: generatedContent,
      };
    } catch (error: unknown) {
      if (logProcessingWarning) {
        console.warn(
          `LLM response for model '${modelsMetadata[modelKey].urn}' cannot be parsed to JSON so marking as overloaded just to be able to try again in the hope of a better response for the next attempt - Error: ${getErrorText(error)}`,
        );
      }
      context.jsonParseError = getErrorText(error);
      return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };
    }
  } else {
    return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
  }
}

/**
 * Convert text content to JSON, trimming the content to only include the JSON part.
 * @param content The text content containing JSON
 * @returns The parsed JSON object with the specified type
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function convertTextToJSON<T = Record<string, unknown>>(content: string): T {
  // This regex finds the first '{' or '[' and matches until the corresponding '}' or ']'.
  // It's more robust than simple indexOf/lastIndexOf.
  const jsonRegex = /({[\s\S]*}|\[[\s\S]*\])/;
  const match = jsonRegex.exec(content);

  if (!match) {
    throw new Error(`Invalid input: No JSON content found for text: ${content}`);
  }

  const jsonString = match[0];
  return JSON.parse(jsonString) as T;
}

/**
 * Validate the LLM response against a Zod schema if provided.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function validateAndReturnStructuredResponse<T>(
  resourceName: string,
  llmResponse: LLMGeneratedContent | null,
  completionOptions: LLMCompletionOptions,
): T | null {
  if (llmResponse && completionOptions.jsonSchema) {
    const validation = completionOptions.jsonSchema.safeParse(llmResponse);

    if (!validation.success) {
      const errorMessage = `LLM response for '${resourceName}' failed Zod schema validation so discarding it. Issues: ${JSON.stringify(validation.error.issues)}`;
      logErrorMsg(errorMessage);
      return null;
    }

    return validation.data as T;
  } else {
    return llmResponse as T;
  }
}
