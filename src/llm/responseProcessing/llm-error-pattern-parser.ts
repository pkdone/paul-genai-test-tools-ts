import { ResolvedLLMModelMetadata, LLMErrorMsgRegExPattern, LLMResponseTokensUsage } from "../../types/llm.types";

/**
 * Extract token usage information from LLM error message.
 */
export function parseTokenUsageFromLLMError(
  modelInternalKey: string, 
  errorMsg: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[]
): LLMResponseTokensUsage {
  const defaultResult: LLMResponseTokensUsage = { 
    promptTokens: -1, 
    completionTokens: 0, 
    maxTotalTokens: -1 
  };
  
  if (!errorPatterns) return defaultResult;
  
  for (const pattern of errorPatterns) {
    const matches = errorMsg.match(pattern.pattern);    
    if (!matches || matches.length <= 1) continue;
    
    if (pattern.units === "tokens") {
      return pattern.isMaxFirst
        ? processTokenMatchMaxFirst(matches)
        : processTokenMatchPromptFirst(matches, modelInternalKey, llmModelsMetadata);
    } else {
      return pattern.isMaxFirst
        ? processCharMatchMaxFirst(matches, modelInternalKey, llmModelsMetadata)
        : processCharMatchPromptFirst(matches, modelInternalKey, llmModelsMetadata);
    }
  }
  
  return defaultResult;
}

/**
 * Extract token values from a regex match when max tokens is the first capture group
 */
function processTokenMatchMaxFirst(
  matches: RegExpMatchArray
): LLMResponseTokensUsage {
  return {
    maxTotalTokens: parseInt(matches[1], 10),
    promptTokens: matches.length > 2 ? parseInt(matches[2], 10) : -1,
    completionTokens: matches.length > 3 ? parseInt(matches[3], 10) : 0
  };
}

/**
 * Extract token values from a regex match when prompt tokens is the first capture group
 */
function processTokenMatchPromptFirst(
  matches: RegExpMatchArray,
  modelInternalKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>
): LLMResponseTokensUsage {
  return {
    promptTokens: parseInt(matches[1], 10),
    maxTotalTokens: matches.length > 2 ? parseInt(matches[2], 10) : llmModelsMetadata[modelInternalKey].maxTotalTokens,
    completionTokens: matches.length > 3 ? parseInt(matches[3], 10) : 0
  };
}

/**
 * Processes regex match for a char-based error pattern where max chars come first
 */
function processCharMatchMaxFirst(
  matches: RegExpMatchArray,
  modelInternalKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>
): LLMResponseTokensUsage {
  if (matches.length <= 2) {
    return { maxTotalTokens: -1, promptTokens: -1, completionTokens: 0 };
  }
  
  const charsLimit = parseInt(matches[1], 10);
  const charsPrompt = parseInt(matches[2], 10);
  
  return calculateTokensFromChars(charsPrompt, charsLimit, modelInternalKey, llmModelsMetadata);
}

/**
 * Processes regex match for a char-based error pattern where prompt chars come first
 */
function processCharMatchPromptFirst(
  matches: RegExpMatchArray,
  modelInternalKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>
): LLMResponseTokensUsage {
  if (matches.length <= 2) {
    return { maxTotalTokens: -1, promptTokens: -1, completionTokens: 0 };
  }
  
  const charsPrompt = parseInt(matches[1], 10);
  const charsLimit = parseInt(matches[2], 10);
  
  return calculateTokensFromChars(charsPrompt, charsLimit, modelInternalKey, llmModelsMetadata);
}

/**
 * Calculate token usage from character measurements
 */
function calculateTokensFromChars(
  charsPrompt: number, 
  charsLimit: number, 
  modelInternalKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>
): LLMResponseTokensUsage {
  const maxTotalTokens = llmModelsMetadata[modelInternalKey].maxTotalTokens;
  const promptTokensDerived = Math.ceil((charsPrompt / charsLimit) * maxTotalTokens);
  
  return {
    maxTotalTokens,
    promptTokens: Math.max(promptTokensDerived, maxTotalTokens + 1),
    completionTokens: 0
  };
}
