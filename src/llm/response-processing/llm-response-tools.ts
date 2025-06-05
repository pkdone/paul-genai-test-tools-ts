import llmConfig from "../../config/llm.config";
import { LLMPurpose, LLMResponseTokensUsage, LLMFunctionResponse, LLMGeneratedContent,
         LLMResponseStatus, LLMContext, ResolvedLLMModelMetadata, LLMErrorMsgRegExPattern} from "../../types/llm.types";
import { BadResponseContentLLMError } from "../../types/llm-errors.types";
import { convertTextToJSON } from "../../utils/json-tools";
import { getErrorText } from "../../utils/error-utils";
import { parseTokenUsageFromLLMError } from "./llm-error-pattern-parser";

/**
 * Extract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(
  modelInternalKey: string, 
  tokenUsage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>
) : LLMResponseTokensUsage {
  let { promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
  if (completionTokens < 0) completionTokens = 0;
  if (maxTotalTokens < 0) maxTotalTokens = modelsMetadata[modelInternalKey].maxTotalTokens;
  if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens + 1);
  return { promptTokens, completionTokens, maxTotalTokens };
}

/**
 * Extract token usage information and limit from LLM error message. Derives values
 * for all prompt/completions/maxTokens if not found in the error message.
 */
export function extractTokensAmountAndLimitFromErrorMsg(
  modelInternalKey: string, 
  prompt: string, 
  errorMsg: string,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[]
) : LLMResponseTokensUsage {
  const { maxTotalTokens: parsedMaxTokens, promptTokens: parsedPromptTokens, completionTokens } = 
    parseTokenUsageFromLLMError(modelInternalKey, errorMsg, modelsMetadata, errorPatterns);  
  const publishedMaxTotalTokens = modelsMetadata[modelInternalKey].maxTotalTokens;
  let maxTotalTokens = parsedMaxTokens;
  let promptTokens = parsedPromptTokens;

  if (promptTokens < 0) { 
    const assumedMaxTotalTokens = (maxTotalTokens > 0) ? maxTotalTokens : publishedMaxTotalTokens;
    const estimatedPromptTokensConsumed = Math.floor(prompt.length / llmConfig.MODEL_CHARS_PER_TOKEN_ESTIMATE);
    promptTokens = Math.max(estimatedPromptTokensConsumed, (assumedMaxTotalTokens + 1));
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}    

/** 
 * Post-process the LLM response, converting it to JSON if necessary, and build the
 * response metadaat object.
 */
export function postProcessAsJSONIfNeededGeneratingNewResult(
  skeletonResult: LLMFunctionResponse, 
  modelInternalKey: string, 
  taskType: LLMPurpose, 
  responseContent: LLMGeneratedContent, 
  asJson: boolean, 
  context: LLMContext,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>
) {
  if (taskType === LLMPurpose.COMPLETIONS) {
    try {
      if (typeof responseContent !== "string") throw new BadResponseContentLLMError("Generated content is not a string", responseContent);
      const generatedContent = asJson ? convertTextToJSON(responseContent) : responseContent;
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedContent };
    } catch (error: unknown) {
      console.log(`ISSUE: LLM response cannot be parsed to JSON  (model '${modelsMetadata[modelInternalKey].urn})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
      context.jsonParseError = getErrorText(error);
      return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };
    }
  } else {
    return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
  }      
}  

/**
 * Reduce the size of the prompt to be inside the LLM's indicated token limit.
 */
export function reducePromptSizeToTokenLimit(
  prompt: string, 
  modelInternalKey: string, 
  tokensUage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>
) {
  if (prompt.trim() === "") return prompt;  
  const { promptTokens, completionTokens, maxTotalTokens } = tokensUage;
  const maxCompletionTokensLimit = modelsMetadata[modelInternalKey].maxCompletionTokens; // will be undefined if for embeddings
  let reductionRatio = 1;
  
  // If all the LLM#s available completion tokens have been consumed then will need to reduce prompt size to try influence any subsequenet generated completion to be smaller
  if (maxCompletionTokensLimit && (completionTokens >= (maxCompletionTokensLimit - llmConfig.COMPLETION_MAX_TOKENS_LIMIT_BUFFER))) {
    reductionRatio = Math.min((maxCompletionTokensLimit / (completionTokens + 1)), llmConfig.COMPLETION_TOKENS_REDUCE_MIN_RATIO);
  }

  // If the total tokens used is more than the total tokens available then reduce the prompt size proportionally
  if (reductionRatio >= 1) {
    reductionRatio = Math.min((maxTotalTokens / (promptTokens + completionTokens + 1)), llmConfig.PROMPT_TOKENS_REDUCE_MIN_RATIO);
  }

  const newPromptSize = Math.floor(prompt.length * reductionRatio);
  return prompt.substring(0, newPromptSize);
}
