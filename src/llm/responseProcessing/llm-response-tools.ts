import { LLMPurpose, LLMResponseTokensUsage, LLMFunctionResponse, LLMGeneratedContent,
         LLMResponseStatus, LLMContext, ResolvedLLMModelMetadata} from "../../types/llm.types";
import { BadResponseContentLLMError } from "../../types/llm-errors.types";
import { convertTextToJSON } from "../../utils/json-tools";
import { getErrorText } from "../../utils/error-utils";

/**
 * Extract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(
  modelKey: string, 
  tokenUsage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>
) : LLMResponseTokensUsage {
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
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>
): LLMFunctionResponse {
  if (taskType === LLMPurpose.COMPLETIONS) {
    try {
      if (typeof responseContent !== "string") throw new BadResponseContentLLMError("Generated content is not a string", responseContent);
      const generatedContent = asJson ? convertTextToJSON(responseContent) : responseContent;
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedContent };
    } catch (error: unknown) {
      console.warn(`ISSUE: LLM response cannot be parsed to JSON  (model '${modelsMetadata[modelKey].urn})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
      context.jsonParseError = getErrorText(error);
      return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };
    }
  } else {
    return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
  }      
}  


