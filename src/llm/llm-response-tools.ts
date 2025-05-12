import { llmConst,llmAPIErrorPatterns } from "../types/llm-constants";
import { ModelKey } from "../types/llm-models-metadata";
import { llmModelsMetadataLoaderSrvc } from "./llm-configurator/llm-models-metadata-loader";
import { LLMPurpose, LLMResponseTokensUsage, LLMFunctionResponse, LLMGeneratedContent,
         LLMResponseStatus, 
         LLMContext} from "../types/llm-types";
import { BadResponseContentLLMError } from "../types/llm-errors";
import { convertTextToJSON } from "../utils/json-tools";
import { getErrorText } from "../utils/error-utils";

/**
 * Etract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(modelKey: ModelKey, tokenUsage: LLMResponseTokensUsage) {
  const llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
  let { promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
  if (completionTokens < 0) completionTokens = 0;
  if (maxTotalTokens < 0) maxTotalTokens = llmModelsMetadata[modelKey].maxTotalTokens;
  if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens + 1);
  return { promptTokens, completionTokens, maxTotalTokens };
}

/**
 * Extract token usage information and limit from LLM error message. Derives values
 * for all prompt/completions/maxTokens if not found in the error message.
 */
export function extractTokensAmountAndLimitFromErrorMsg(modelKey: ModelKey, prompt: string, errorMsg: string) {
  const llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
  // eslint-disable-next-line prefer-const
  let { maxTotalTokens, promptTokens, completionTokens } = parseTokenUsageFromLLMError(modelKey, errorMsg);
  const publishedMaxTotalTokens  = llmModelsMetadata[modelKey].maxTotalTokens;

  if (promptTokens < 0) { 
    const assumedMaxTotalTokens = (maxTotalTokens > 0) ? maxTotalTokens : publishedMaxTotalTokens;
    const estimatedPromptTokensConsumed = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
    promptTokens = Math.max(estimatedPromptTokensConsumed, (assumedMaxTotalTokens + 1));
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}    

/**
 * Extract token usage information from LLM error message.
 */
function parseTokenUsageFromLLMError(modelKey: ModelKey, errorMsg: string) {
  let promptTokens = -1;
  let completionTokens = 0;
  let maxTotalTokens = -1;      
  const llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
  const patternDefinitions = llmAPIErrorPatterns[llmModelsMetadata[modelKey].apiFamily];
  
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

  return { maxTotalTokens, promptTokens, completionTokens };
}

/** 
 * Post-process the LLM response, converting it to JSON if necessary, and build the
 * response metadaat object.
 */
export function postProcessAsJSONIfNeededGeneratingNewResult(skeletonResult: LLMFunctionResponse, modelKey: ModelKey, taskType: LLMPurpose, responseContent: LLMGeneratedContent, asJson: boolean, context: LLMContext) {
  const llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    

  if (taskType === LLMPurpose.COMPLETIONS) {
    try {
      if (typeof responseContent !== "string") throw new BadResponseContentLLMError("Generated content is not a string", responseContent);
      const generatedContent = asJson ? convertTextToJSON(responseContent) : responseContent;
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedContent };
    } catch (error: unknown) {
      console.log(`ISSUE: LLM response cannot be parsed to JSON  (model '${llmModelsMetadata[modelKey].modelId})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
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
export function reducePromptSizeToTokenLimit(prompt: string, modelKey: ModelKey, tokensUage: LLMResponseTokensUsage) {
  // Special case: if prompt is only whitespace, return it unchanged
  if (prompt.trim() === "") return prompt;
  
  const llmModelsMetadata = llmModelsMetadataLoaderSrvc.getModelsMetadata();    
  const { promptTokens, completionTokens, maxTotalTokens } = tokensUage;
  const maxCompletionTokensLimit = llmModelsMetadata[modelKey].maxCompletionTokens; // will be undefined if for embeddings
  let reductionRatio = 1;
  
  // If all the LLM#s available completion tokens have been consumed then will need to reduce prompt size to try influence any subsequenet generated completion to be smaller
  if (maxCompletionTokensLimit && (completionTokens >= (maxCompletionTokensLimit - llmConst.COMPLETION_MAX_TOKENS_LIMIT_BUFFER))) {
    reductionRatio = Math.min((maxCompletionTokensLimit / (completionTokens + 1)), llmConst.COMPLETION_TOKENS_REDUCE_MIN_RATIO);
  }

  // If the total tokens used is more than the total tokens available then reduce the prompt size proportionally
  if (reductionRatio >= 1) {
    reductionRatio = Math.min((maxTotalTokens / (promptTokens + completionTokens + 1)), llmConst.PROMPT_TOKENS_REDUCE_MIN_RATIO);
  }

  const newPromptSize = Math.floor(prompt.length * reductionRatio);
  return prompt.substring(0, newPromptSize);
}
