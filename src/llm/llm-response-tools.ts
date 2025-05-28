import llmConfig from "../config/llm.config";
import { ModelKey, ModelProviderType } from "../types/llm-models-types";
import { LLMPurpose, LLMResponseTokensUsage, LLMFunctionResponse, LLMGeneratedContent,
         LLMResponseStatus, LLMContext, LLMModelMetadata, LLMErrorMsgRegExPattern} from "../types/llm-types";
import { BadResponseContentLLMError } from "../types/llm-errors";
import { convertTextToJSON } from "../utils/json-tools";
import { getErrorText } from "../utils/error-utils";

// Legacy error patterns for backward compatibility
const legacyErrorPatterns: Readonly<Record<string, readonly LLMErrorMsgRegExPattern[]>> = {
  [ModelProviderType.OPENAI]: [
    // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
    { pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens" },
    // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
    { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens" },
  ] as const,
  [ModelProviderType.BEDROCK]: [
    // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
    { pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/, units: "tokens" },
    // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
    { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars" },
    // 3. Llama: "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
    { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens" },
  ] as const,
  [ModelProviderType.VERTEXAI]: [] as const,
} as const;

/**
 * Extract token usage information from LLM response metadata, defaulting missing
 * values.
 */
export function extractTokensAmountFromMetadataDefaultingMissingValues(
  modelKey: ModelKey, 
  tokenUsage: LLMResponseTokensUsage,
  modelsMetadata?: Record<string, LLMModelMetadata>
) {
  // For backward compatibility, if no metadata provided, we can't default missing values
  if (!modelsMetadata) {
    throw new Error("Model metadata is required for extractTokensAmountFromMetadataDefaultingMissingValues");
  }
  
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
  modelKey: ModelKey, 
  prompt: string, 
  errorMsg: string,
  modelsMetadata?: Record<string, LLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[]
) {
  // For backward compatibility, if no metadata provided, we can't extract token amounts
  if (!modelsMetadata) {
    throw new Error("Model metadata is required for extractTokensAmountAndLimitFromErrorMsg");
  }
  
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
  modelKey: ModelKey, 
  errorMsg: string,
  llmModelsMetadata: Record<string, LLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[]
) {
  let promptTokens = -1;
  let completionTokens = 0;
  let maxTotalTokens = -1;      
  
  // Use provided error patterns or fall back to legacy patterns for backward compatibility
  const patternDefinitions = errorPatterns ?? legacyErrorPatterns[llmModelsMetadata[modelKey].modelProvider];
  
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
export function postProcessAsJSONIfNeededGeneratingNewResult(
  skeletonResult: LLMFunctionResponse, 
  modelKey: ModelKey, 
  taskType: LLMPurpose, 
  responseContent: LLMGeneratedContent, 
  asJson: boolean, 
  context: LLMContext,
  modelsMetadata?: Record<string, LLMModelMetadata>
) {
  // For backward compatibility, if no metadata provided, we can't get model ID for logging
  if (!modelsMetadata) {
    throw new Error("Model metadata is required for postProcessAsJSONIfNeededGeneratingNewResult");
  }

  if (taskType === LLMPurpose.COMPLETIONS) {
    try {
      if (typeof responseContent !== "string") throw new BadResponseContentLLMError("Generated content is not a string", responseContent);
      const generatedContent = asJson ? convertTextToJSON(responseContent) : responseContent;
      return { ...skeletonResult, status: LLMResponseStatus.COMPLETED, generated: generatedContent };
    } catch (error: unknown) {
      console.log(`ISSUE: LLM response cannot be parsed to JSON  (model '${modelsMetadata[modelKey].modelId})', so marking as overloaded just to be able to try again in the hope of a better response for the next attempt`);
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
  modelKey: ModelKey, 
  tokensUage: LLMResponseTokensUsage,
  modelsMetadata?: Record<string, LLMModelMetadata>
) {
  // Special case: if prompt is only whitespace, return it unchanged
  if (prompt.trim() === "") return prompt;
  
  // For backward compatibility, if no metadata provided, we can't reduce prompt size
  if (!modelsMetadata) {
    throw new Error("Model metadata is required for reducePromptSizeToTokenLimit");
  }
  
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
