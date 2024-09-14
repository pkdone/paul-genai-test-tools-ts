import { llmConst } from "../types/llm-constants";
import { llmModels } from "../types/llm-models";
import { LLMPurpose, LLMResponseTokensUsage, LLMFunctionResponse, LLMGeneratedContent,
         LLMResponseStatus,LLMErrorMsgRegExPattern } from "../types/llm-types";


/**
 * Function to extract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(model: string, tokenUsage: LLMResponseTokensUsage): LLMResponseTokensUsage {
  let {promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
  if (completionTokens < 0) completionTokens = 0;
  if (maxTotalTokens < 0) maxTotalTokens = llmModels[model].maxTotalTokens;
  if (promptTokens < 0) promptTokens = Math.max(1, maxTotalTokens - completionTokens);
  return { promptTokens, completionTokens, maxTotalTokens };
}


/**
 * Function to extract token usage information and limit from LLM error message. Derives values
 * for all prompt/completions/maxTokens if not found in the error message.
 */
export function extractTokensAmountAndLimitFromErrorMsg(model: string, patternDefinitions: LLMErrorMsgRegExPattern[], prompt: string, errorMsg: string): LLMResponseTokensUsage {
  let promptTokens = -1;
  let completionTokens = 0;
  let maxTotalTokens = -1;    

  if (patternDefinitions) {
    for (const patternDefinition of patternDefinitions) {
      const matches = errorMsg.match(patternDefinition.pattern);

      if (matches && matches.length > 2) {
        if (patternDefinition.units === "tokens") {
          maxTotalTokens = parseInt(matches[1], 10);
          promptTokens = parseInt(matches[2], 10);
          completionTokens = matches.length > 3 ? parseInt(matches[3], 10) : 0;
        } else {
          const charsLimit = parseInt(matches[1], 10);
          const charsPrompt = parseInt(matches[2], 10);
          maxTotalTokens = llmModels[model].maxTotalTokens;  
          const promptTokensDerived = Math.ceil((charsPrompt/ charsLimit) * maxTotalTokens);
          promptTokens = Math.max(promptTokensDerived, maxTotalTokens + 1);
        }
        
        break;
      }
    }
  }

  const publishedMaxTotalTokens  = llmModels[model].maxTotalTokens;

  if (promptTokens < 0) { 
    const assumedMaxTotalTokens = (maxTotalTokens > 0) ? maxTotalTokens : publishedMaxTotalTokens;
    const estimatedPromptTokensConsumed = Math.floor(prompt.length / llmConst.MODEL_CHARS_PER_TOKEN_ESTIMATE);
    promptTokens = Math.max(estimatedPromptTokensConsumed, (assumedMaxTotalTokens + 1));
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}    


/** 
 * Function to post-process the LLM response, converting it to JSON if necessary, and build the
 * response metadaat object.
 */
export function postProcessAsJSONIfNeededGeneratingNewResult(skeletonResult: LLMFunctionResponse, model: string, taskType: LLMPurpose, responseContent: LLMGeneratedContent, doReturnJSON: boolean): LLMFunctionResponse {
  if (taskType === LLMPurpose.COMPLETION) {
    try {
      if (typeof responseContent !== "string") throw new Error("Generated content is not a string");
      let generatedContent = responseContent;
      if (doReturnJSON) generatedContent = convertTextToJSON(generatedContent);
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedContent };
    } catch (error) {
      console.log(`ISSUE: LLM response cannot be parsed to JSON  (model '${model})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
      return { ...skeletonResult, status: LLMResponseStatus.OVERLOADED };
    }
  } else {
    return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: responseContent };
  }      
}  


/**
 * Reduce the size of the prompt to be inside the LLM's indicated token limit.
 */
export function reducePromptSizeToTokenLimit(prompt: string, model: string, tokensUage: LLMResponseTokensUsage): string {
  const { promptTokens, completionTokens, maxTotalTokens } = tokensUage;
  const maxCompletionTokensLimit = llmModels[model].maxCompletionTokens; // will be undefined if for embeddings
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


/**
 * Convert the LLM response content to JSON, trimming the content to only include the JSON part.
 */
function convertTextToJSON(content: string): string {
  const startJSONIndex = content.indexOf("{");
  const endJSONIndex = content.lastIndexOf("}");

  if (startJSONIndex === -1 || endJSONIndex === -1) {
    throw new Error("Invalid input: No JSON content found.");
  }

  const trimmedContent = content.substring(startJSONIndex, endJSONIndex + 1);
  const sanitizedContent = trimmedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x0A\x0D\x09]/g, " ");  // Remove control characters
  return JSON.parse(sanitizedContent);
}
