
/**
 * GENERAL NOTES:
 *  - For Completionss LLMs, the total allowed tokens is the sum of the prompt tokens and the 
 *    completions tokens.
 * 
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 * 
 * SPECIFIC LLM NOTES:
 *  - GCP_COMPLETIONS_GEMINI_FLASH15: For some reason the listed 'maxCompletionsTokens' value of
 *    8192isn't always hit for Flash15, so not clear if it is actually higher than for Pro which, if
 *    it, is, would be a bit weird
 * 
 *  - AWS_COMPLETIONS_CLAUDE_V35: According to Anthropic site, the 'maxCompletionsTokens' should be 
 *    8192 but Bedrock seems to cut this short to usually 4095 or 4096 but have seen 4090 reported 
 *    for some LLM responses, so using a few tokens buffer to come up with a limit of 4088
 * 
 *  - AWS_COMPLETIONS_CLAUDE_V37: Bedrock seems to be limiting the max model tokens to 132k and 
 *    erroring if greater, even though Bedrock advertises it as 200k.
 * 
 *  - AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT: Not clear if
 *    'maxCompletionsTokens' is actually less than listed value of 8192
 */
import { LLMModelSet } from "./llm-types";

/**
 * Type for model provider to set of model keys mappings.
 */
export type ModelFamilyToModelKeyMappings = Readonly<Record<ModelFamily, LLMModelSet>>;

/**
 * Enum for model provider types
 */
export enum ModelProviderType {
  N_A = "n/a",
  OPENAI = "OpenAI",
  AZURE = "Azure",
  VERTEXAI = "VertexAI",
  BEDROCK = "Bedrock",
}

/**
 * Enum to define the LLM model family.
 */
export enum ModelFamily {
  OPENAI_MODELS = "OpenAI",
  AZURE_OPENAI_MODELS = "AzureOpenAI",
  VERTEXAI_GEMINI_MODELS = "VertexAIGemini",
  BEDROCK_TITAN_MODELS = "BedrockTitan",
  BEDROCK_CLAUDE_MODELS = "BedrockClaude",
  BEDROCK_LLAMA_MODELS = "BedrockLlama",
  BEDROCK_MISTRAL_MODELS = "BedrockMistral",
  BEDROCK_NOVA_MODELS = "BedrockNova",
  BEDROCK_DEEPSEEK_MODELS = "BedrockDeepseek",
};

/**
 * Enum to define the keys of the service provider-speciifc exposed LLM models.
 */
export enum ModelKey {
 UNSPECIFIED = "UNSPECIFIED",
 GPT_EMBEDDINGS_ADA002 = "GPT_EMBEDDINGS_ADA002",
 GPT_EMBEDDINGS_TEXT_3SMALL = "GPT_EMBEDDINGS_TEXT_3SMALL",
 GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4",
 GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k",
 GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO",
 GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O",
 GCP_EMBEDDINGS_ADA_GECKO = "GCP_EMBEDDINGS_ADA_GECKO",
 GCP_EMBEDDINGS_TEXT_005 = "GCP_EMBEDDINGS_TEXT_005",
 GCP_COMPLETIONS_GEMINI_FLASH15 = "GCP_COMPLETIONS_GEMINI_FLASH15",
 GCP_COMPLETIONS_GEMINI_PRO15 = "GCP_COMPLETIONS_GEMINI_PRO15",
 GCP_COMPLETIONS_GEMINI_FLASH20 = "GCP_COMPLETIONS_GEMINI_FLASH20",
 GCP_COMPLETIONS_GEMINI_PRO20 = "GCP_COMPLETIONS_GEMINI_PRO20",
 GCP_COMPLETIONS_GEMINI_PRO25 = "GCP_COMPLETIONS_GEMINI_PRO25",
 AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1",
 AWS_COMPLETIONS_TITAN_EXPRESS_V1 = "AWS_COMPLETIONS_TITAN_EXPRESS_V1",
 AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35",
 AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37",
 AWS_COMPLETIONS_CLAUDE_V40 = "AWS_COMPLETIONS_CLAUDE_V40",
 AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V3_8B_INSTRUCT",
 AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT",
 AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT",
 AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
 AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE",
 AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2",
 AWS_COMPLETIONS_NOVA_PRO_V1 = "AWS_COMPLETIONS_NOVA_PRO_V1",
 AWS_COMPLETIONS_NOVA_LITE_V1 = "AWS_COMPLETIONS_NOVA_LITE_V1",
 AWS_COMPLETIONS_DEEPSEEKE_R1 = "AWS_COMPLETIONS_DEEPSEEKE_R1",
 AZURE_OPENAI_MODELS = "AZURE_OPENAI_MODELS"
}


