import { LLMProviderManifest } from "../llm-provider-manifest.types";
import { ModelFamily, ModelProviderType, ModelKey } from "../../../types/llm-models-types";
import OpenAILLM from "../../llms-impl/openai/openai-llm";

export const openAIProviderManifest: LLMProviderManifest = {
  providerName: "OpenAI GPT",
  modelFamily: ModelFamily.OPENAI_MODELS,
  modelProviderType: ModelProviderType.OPENAI,
  envVarNames: ["OPENAI_LLM_API_KEY"],
  models: {
    embeddings: {
      key: ModelKey.GPT_EMBEDDINGS_TEXT_3SMALL,
      id: "text-embedding-3-small",
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      key: ModelKey.GPT_COMPLETIONS_GPT4_O,
      id: "gpt-4o",
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      key: ModelKey.GPT_COMPLETIONS_GPT4_TURBO,
      id: "gpt-4-turbo",
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: [
    // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
    { pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/, units: "tokens" },
    // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
    { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens" },
  ] as const,
  factory: (envConfig, modelSet, modelsMetadata, errorPatterns) => {
    const env = envConfig as { OPENAI_LLM_API_KEY: string };
    return new OpenAILLM(modelSet, modelsMetadata, errorPatterns, env.OPENAI_LLM_API_KEY);
  },
}; 