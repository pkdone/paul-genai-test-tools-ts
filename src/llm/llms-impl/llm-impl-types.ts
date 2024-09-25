import { LLMGeneratedContent, LLMResponseTokensUsage } from "../../types/llm-types";

/**
 * Type to define the summary of the processed LLM implementation's response.
 */
export type LLMImplSpecificResponseSummary = {
  isIncompleteResponse: boolean;
  responseContent: LLMGeneratedContent;
  tokenUsage: LLMResponseTokensUsage;
};
