import { LLMPurpose, LLMApiFamily, LLMModelMetadata } from "./llm-types";


/**
 * Constant map to define the key properties of the LLM models.
 * 
 * For Completion LLMs, the total allowed tokens is the sum of the prompt tokens and the completion
 * tokens.
 * For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the response
 * is a fixed size array of numbers - embeddings).
 */
export const llmModels: Readonly<{ [key: string]: Readonly<LLMModelMetadata> }> = {
  "UNSPECIFIED": {
    modelId: "n/a",
    purpose: LLMPurpose.N_A,
    maxDimensions: -1,
    maxTotalTokens: -1,
    apiFamily: LLMApiFamily.N_A,
  },
  "GPT_EMBEDDINGS_ADA002": {
    modelId: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxDimensions: 1_536,
    maxTotalTokens: 8_191,
    apiFamily: LLMApiFamily.OPENAI,
  },
  "GPT_EMBEDDINGS_TEXT_EMBDG3": {
    modelId: "text-embedding-3-small",
    purpose: LLMPurpose.EMBEDDINGS,
    maxDimensions: 1_536,
    maxTotalTokens: 8_191,
    apiFamily: LLMApiFamily.OPENAI,
  },
  "GPT_COMPLETIONS_GPT4": {
    modelId: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 8_192,
    apiFamily: LLMApiFamily.OPENAI,
  },
  "GPT_COMPLETIONS_GPT4_32k": {
    modelId: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4_096,
    maxTotalTokens: 32_768,
    apiFamily: LLMApiFamily.OPENAI,
  },
  "GPT_COMPLETIONS_GPT4_TURBO": {
    modelId: "gpt-4-turbo",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4_096,
    maxTotalTokens: 128_000,
    apiFamily: LLMApiFamily.OPENAI,
  },  
  "GPT_COMPLETIONS_GPT4_O": {
    modelId: "gpt-4o",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 16_384,
    maxTotalTokens: 128_000,
    apiFamily: LLMApiFamily.OPENAI,
  },  
  "GCP_EMBEDDINGS_ADA_GECKO": {
    modelId: "textembedding-gecko",
    purpose: LLMPurpose.EMBEDDINGS,
    maxTotalTokens: 3_072,
    maxDimensions: 768,
    apiFamily: LLMApiFamily.VERTEXAI,
  },
  "GCP_COMPLETIONS_GEMINI_FLASH15": {
    modelId: "gemini-1.5-flash-001",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,  // For some reason this listed completion tokens limit isn't always hit for Flash15, so is it actually higher than for Pro which would be a bit weird?
    maxTotalTokens: 1_048_576,
    apiFamily: LLMApiFamily.VERTEXAI,
  },
  "GCP_COMPLETIONS_GEMINI_PRO15": {
    modelId: "gemini-1.5-pro-001",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,  
    maxTotalTokens: 2_097_152,
    apiFamily: LLMApiFamily.VERTEXAI,
  },
  "AWS_EMBEDDINGS_TITAN_V1": {
    modelId: "amazon.titan-embed-text-v1",
    purpose: LLMPurpose.EMBEDDINGS,
    maxTotalTokens: 8_192,
    maxDimensions: 1024,
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_TITAN_EXPRESS_V1": {
    modelId: "amazon.titan-text-express-v1",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_191,
    maxTotalTokens: 8_191,
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_CLAUDE_V35": {
    modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4_086,  // According to Anthropic site, this limit should be 8192 but Bedrock seems to cut this short to usuall 4095 or 4096 bu6 have seen 4090 reported for some LLM responses, so using few tokens buffer to come up with a limit of 4,088
    maxTotalTokens: 200_000,
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT": {
    modelId: "meta.llama3-8b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,  // Not clear if the limit is actually less than this
    maxTotalTokens: 8_192,          
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT": {
    modelId: "meta.llama3-70b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,  // Not clear if the limit is actually less than this
    maxTotalTokens: 8_192,          
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT": {
    modelId: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 128_000,
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_MISTRAL_LARGE": {
    modelId: "mistral.mistral-large-2402-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 32_768,
    apiFamily: LLMApiFamily.BEDROCK,
  },
  "AWS_COMPLETIONS_MISTRAL_LARGE2": {
    modelId: "mistral.mistral-large-2407-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 131_072,
    apiFamily: LLMApiFamily.BEDROCK,
  }, 
} as const;
