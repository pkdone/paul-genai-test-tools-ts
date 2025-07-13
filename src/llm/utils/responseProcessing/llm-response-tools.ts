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
import {
  BadResponseContentLLMError,
  RejectionResponseLLMError,
} from "../../errors/llm-errors.types";
import { convertTextToJSON } from "../../../common/utils/json-tools";
import { getErrorText, logErrorMsg } from "../../../common/utils/error-utils";
import { logWithContext } from "../routerTracking/llm-router-logging";

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
 * Handles the outcome of an LLM call and determines the next action to take.
 */
export function handleUnsuccessfulLLMCallOutcome(
  llmResponse: LLMFunctionResponse | null,
  currentLLMIndex: number,
  totalLLMCount: number,
  context: LLMContext,
  resourceName: string,
): { shouldTerminate: boolean; shouldCropPrompt: boolean; shouldSwitchToNextLLM: boolean } {
  const isOverloaded = !llmResponse || llmResponse.status === LLMResponseStatus.OVERLOADED;
  const isExceeded = llmResponse?.status === LLMResponseStatus.EXCEEDED;
  const canSwitchModel = currentLLMIndex + 1 < totalLLMCount;

  if (isOverloaded) {
    logWithContext(
      `LLM problem processing prompt for completion with current LLM model because it is overloaded, timing out or is spitting out invalid JSON (if JSON was requested), even after retries `,
      context,
    );
    return {
      shouldTerminate: !canSwitchModel,
      shouldCropPrompt: false,
      shouldSwitchToNextLLM: canSwitchModel,
    };
  } else if (isExceeded) {
    logWithContext(
      `LLM prompt tokens used ${llmResponse.tokensUage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`,
      context,
    );
    return {
      shouldTerminate: false,
      shouldCropPrompt: !canSwitchModel,
      shouldSwitchToNextLLM: canSwitchModel,
    };
  } else {
    throw new RejectionResponseLLMError(
      `An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource '${resourceName}' - response status received: '${llmResponse.status}'`,
      llmResponse,
    );
  }
}

/**
 * Validate the LLM response against a Zod schema if provided.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function validateAndReturnStructuredResponse<T>(
  resourceName: string,
  llmResponse: LLMGeneratedContent | null,
  options: LLMCompletionOptions,
): T | null {
  if (options.jsonSchema) {
    const validation = options.jsonSchema.safeParse(llmResponse);

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
