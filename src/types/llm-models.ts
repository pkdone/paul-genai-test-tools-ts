import { LLMPurpose, LLMModelMetadata, LLMApiFamily } from "./llm-types";


/**
 * Enum to define the LLM model family.
 */
export enum ModelFamily {
  OPENAI_MODELS = "OpenAI",
  AZURE_OPENAI_MODELS = "AzureOpenAI", 
  VERTEXAI_GEMINI_MODELS = "VertexAIGemini",
  BEDROCK_TITAN_MODELS = "BedrockTitan",
  EDROCK_CLAUDE_MODELS = "BedrockClaude",
  BEDROCK_LLAMA_MODELS = "BedrockLlama",
  BEDROCK_MISTRAL_MODELS = "BedrockMistral",
};


/**
 * Constant map to define the LLM model labels.
 */
export const GPT_EMBEDDINGS_MODEL_ADA002 = "text-embedding-ada-002"; 
export const GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3 = "text-embedding-3-small";
export const GPT_COMPLETIONS_MODEL_GPT4 = "gpt-4"; 
export const GPT_COMPLETIONS_MODEL_GPT4_32k = "gpt-4-32k"; 
export const GPT_COMPLETIONS_MODEL_GPT4_TURBO = "gpt-4-turbo";
export const GPT_COMPLETIONS_MODEL_GPT4_O = "gpt-4o-2024-08-06";  // change to point to "gpt-4o" once that points to this version, see: https://platform.openai.com/docs/models/gpt-4o
export const GCP_EMBEDDINGS_MODEL_ADA_GECKO = "textembedding-gecko";
export const GCP_COMPLETIONS_MODEL_GEMINI_FLASH15 = "gemini-1.5-flash-001";
export const GCP_COMPLETIONS_MODEL_GEMINI_PRO15 = "gemini-1.5-pro-001";
export const AWS_EMBEDDINGS_MODEL_TITAN_V1 = "amazon.titan-embed-text-v1";
export const AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1 = "amazon.titan-text-express-v1";
export const AWS_COMPLETIONS_MODEL_CLAUDE_V35 = "anthropic.claude-3-5-sonnet-20240620-v1:0";
export const AWS_COMPLETIONS_MODEL_LLAMA_V3_8B_INSTRUCT = "meta.llama3-8b-instruct-v1:0";
export const AWS_COMPLETIONS_MODEL_LLAMA_V3_70B_INSTRUCT = "meta.llama3-70b-instruct-v1:0";
export const AWS_COMPLETIONS_MODEL_LLAMA_V31_405B_INSTRUCT = "meta.llama3-1-405b-instruct-v1:0";
export const AWS_COMPLETIONS_MODEL_MISTRAL_LARGE =  "mistral.mistral-large-2402-v1:0";
export const AWS_COMPLETIONS_MODEL_MISTRAL_LARGE2 = "mistral.mistral-large-2407-v1:0";
export const MODEL_NOT_SPECIFIED = "n/a";


/**
 * Constant map to define the key properties of the LLM models.
 * 
 * For Completion LLMs, the total allowed tokens is the sum of the prompt tokens and the completion
 * tokens.
 * For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the response
 * is a fixed size embeddings array of numbers).
 */
export const llmModels: Readonly<{ [key: string]: Readonly<LLMModelMetadata> }> = {
  [GPT_EMBEDDINGS_MODEL_ADA002]: {
    purpose: LLMPurpose.EMBEDDINGS,
    maxDimensions: 1_536,
    maxTotalTokens: 8_191,
    llmApi: LLMApiFamily.GPT,
  },
  [GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3]: {
    purpose: LLMPurpose.EMBEDDINGS,
    maxDimensions: 1_536,
    maxTotalTokens: 8_191,
    llmApi: LLMApiFamily.GPT,
  },
  [GPT_COMPLETIONS_MODEL_GPT4]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 8_192,
    llmApi: LLMApiFamily.GPT,
  },
  [GPT_COMPLETIONS_MODEL_GPT4_32k]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 4_096,
    maxTotalTokens: 32_768,
    llmApi: LLMApiFamily.GPT,
  },
  [GPT_COMPLETIONS_MODEL_GPT4_TURBO]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 4_096,
    maxTotalTokens: 128_000,
    llmApi: LLMApiFamily.GPT,
  },  
  [GPT_COMPLETIONS_MODEL_GPT4_O]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 16_384,
    maxTotalTokens: 128_000,
    llmApi: LLMApiFamily.GPT,
  },  
  [GCP_EMBEDDINGS_MODEL_ADA_GECKO]: {
    purpose: LLMPurpose.EMBEDDINGS,
    maxTotalTokens: 3_072,
    maxDimensions: 768,
    llmApi: LLMApiFamily.VERTEXAI,
  },
  [GCP_COMPLETIONS_MODEL_GEMINI_FLASH15]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 1_048_576,
    llmApi: LLMApiFamily.VERTEXAI,
  },
  [GCP_COMPLETIONS_MODEL_GEMINI_PRO15]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,  // For some reason the completion tokens limit here isn't always hit when it is for Flash15 above so is it actually higher for Pro?
    maxTotalTokens: 2_097_152,
    llmApi: LLMApiFamily.VERTEXAI,
  },
  [AWS_EMBEDDINGS_MODEL_TITAN_V1]: {
    purpose: LLMPurpose.EMBEDDINGS,
    maxTotalTokens: 8_192,
    maxDimensions: 1024,
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_TITAN_EXPRESS_V1]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_191,
    maxTotalTokens: 8_191,
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_CLAUDE_V35]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 4_086,  // According to Anthropic site, this limit should be 8192 but Bedrock seems to cut this short to usuall 4095 or 4096 bu6 have seen 4090 reported for some LLM responses, so using few tokens buffer to come up with a limit of 4,088
    maxTotalTokens: 200_000,
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_LLAMA_V3_8B_INSTRUCT]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,  // Not clear if the limit is actually less than this
    maxTotalTokens: 8_192,          
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_LLAMA_V3_70B_INSTRUCT]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,  // Not clear if the limit is actually less than this
    maxTotalTokens: 8_192,          
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_LLAMA_V31_405B_INSTRUCT]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 128_000,
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_MISTRAL_LARGE]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 32_768,
    llmApi: LLMApiFamily.BEDROCK,
  },
  [AWS_COMPLETIONS_MODEL_MISTRAL_LARGE2]: {
    purpose: LLMPurpose.COMPLETION,
    maxCompletionTokens: 8_192,
    maxTotalTokens: 131_072,
    llmApi: LLMApiFamily.BEDROCK,
  }, 
} as const;
