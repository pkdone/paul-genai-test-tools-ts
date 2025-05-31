import llmConfig from "../config/llm.config";
import { LLMPurpose, LLMResponseTokensUsage, LLMFunctionResponse, LLMGeneratedContent,
         LLMResponseStatus, LLMContext, LLMModelMetadata, LLMErrorMsgRegExPattern} from "../types/llm.types";
import { BadResponseContentLLMError } from "../types/llm-errors.types";
import { convertTextToJSON } from "../utils/json-tools";
import { getErrorText } from "../utils/error-utils";

/**
 * Extract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(
  modelKey: string, 
  tokenUsage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, LLMModelMetadata>
) {
  let { promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
  if (completionTokens < 0) completionTokens = 0;
  if (maxTotalTokens < 0) maxTotalTokens = modelsMetadata[modelKey].maxTotalTokens;
  if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens + 1);
  return { promptTokens, completionTokens, maxTotalTokens };
}

/**
 * Extract token usage information and limit from LLM error message. Derives values
 * for all prompt/completions/maxTokens if not found in the error message.
 */
export function extractTokensAmountAndLimitFromErrorMsg(
  modelKey: string, 
  prompt: string, 
  errorMsg: string,
  modelsMetadata: Record<string, LLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[]
) {
  // eslint-disable-next-line prefer-const
  let { maxTotalTokens, promptTokens, completionTokens } = parseTokenUsageFromLLMError(modelKey, errorMsg, modelsMetadata, errorPatterns);
  const publishedMaxTotalTokens  = modelsMetadata[modelKey].maxTotalTokens;

  if (promptTokens < 0) { 
    const assumedMaxTotalTokens = (maxTotalTokens > 0) ? maxTotalTokens : publishedMaxTotalTokens;
    const estimatedPromptTokensConsumed = Math.floor(prompt.length / llmConfig.MODEL_CHARS_PER_TOKEN_ESTIMATE);
    promptTokens = Math.max(estimatedPromptTokensConsumed, (assumedMaxTotalTokens + 1));
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}    

/**
 * Extract token usage information from LLM error message.
 */
function parseTokenUsageFromLLMError(
  modelKey: string, 
  errorMsg: string,
  llmModelsMetadata: Record<string, LLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[]
) {
  let promptTokens = -1;
  let completionTokens = 0;
  let maxTotalTokens = -1;

  // Use provided error patterns
  const patternDefinitions = errorPatterns;

  if (patternDefinitions) {
    for (const patternDefinition of patternDefinitions) {
      const matches = errorMsg.match(patternDefinition.pattern);

      if (matches && matches.length > 1) {
        if (patternDefinition.units === "tokens") {
          maxTotalTokens = parseInt(matches[1], 10);
          promptTokens = matches.length > 2 ? parseInt(matches[2], 10) : -1;
          completionTokens = matches.length > 3 ? parseInt(matches[3], 10) : 0;
        } else if (matches.length > 2) {
          const charsLimit = parseInt(matches[1], 10);
          const charsPrompt = parseInt(matches[2], 10);
          maxTotalTokens = llmModelsMetadata[modelKey].maxTotalTokens;
          const promptTokensDerived = Math.ceil((charsPrompt / charsLimit) * maxTotalTokens);
          promptTokens = Math.max(promptTokensDerived, maxTotalTokens + 1);
        }

        break;
      }
    }
  }

  return { maxTotalTokens, promptTokens, completionTokens };
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
  modelsMetadata: Record<string, LLMModelMetadata>
) {
  if (taskType === LLMPurpose.COMPLETIONS) {
    try {
      if (typeof responseContent !== "string") throw new BadResponseContentLLMError("Generated content is not a string", responseContent);
      const generatedContent = asJson ? convertTextToJSON(responseContent) : responseContent;
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedContent };
    } catch (error: unknown) {
      console.log(`ISSUE: LLM response cannot be parsed to JSON  (model '${modelsMetadata[modelKey].urn})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
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
  modelKey: string, 
  tokensUage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, LLMModelMetadata>
) {
  if (prompt.trim() === "") return prompt;  
  const { promptTokens, completionTokens, maxTotalTokens } = tokensUage;
  const maxCompletionTokensLimit = modelsMetadata[modelKey].maxCompletionTokens; // will be undefined if for embeddings
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
