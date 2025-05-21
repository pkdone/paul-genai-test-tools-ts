import { EnvVars } from "../../types/env-types";
import { ModelFamily } from "../../types/llm-models-metadata";
import { LLMConfig, BedrockVariantType } from "../../types/llm-config-types";
import { createProvider } from "./llm-provider-factory";
import { getOpenAIConfig, getAzureOpenAIConfig, getVertexAIConfig, getBedrockConfig } from "./llm-config-builder";

/**
 * Initialize and return the appropriate LLM implementation based on environment variables.
 * 
 * @param env The loaded environment variables
 * @returns The appropriate LLM provider implementation
 */
export function initializeLLMImplementation(env: EnvVars) {
  const modelFamily = env.LLM as ModelFamily;
  let config: LLMConfig;

  // Determine the appropriate configuration based on model family
  switch (modelFamily) {
    case ModelFamily.OPENAI_MODELS:
      config = getOpenAIConfig(env);
      break;
    case ModelFamily.AZURE_OPENAI_MODELS:
      config = getAzureOpenAIConfig(env);
      break;
    case ModelFamily.VERTEXAI_GEMINI_MODELS:
      config = getVertexAIConfig(env);
      break;
    case ModelFamily.BEDROCK_TITAN_MODELS:
      config = getBedrockConfig(env, BedrockVariantType.TITAN);
      break;
    case ModelFamily.BEDROCK_CLAUDE_MODELS:
      config = getBedrockConfig(env, BedrockVariantType.CLAUDE);
      break;
    case ModelFamily.BEDROCK_LLAMA_MODELS:
      config = getBedrockConfig(env, BedrockVariantType.LLAMA);
      break;
    case ModelFamily.BEDROCK_MISTRAL_MODELS:
      config = getBedrockConfig(env, BedrockVariantType.MISTRAL);
      break;
    case ModelFamily.BEDROCK_NOVA_MODELS:
      config = getBedrockConfig(env, BedrockVariantType.NOVA);
      break;
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS:
      config = getBedrockConfig(env, BedrockVariantType.DEEPSEEK);
      break;
    default: {
      const exhaustiveCheck: never = modelFamily;
      throw new Error(`Unsupported model family: ${String(exhaustiveCheck)}`);
    }
  }

  // Use the factory to create the appropriate LLM provider
  return createProvider(config);
}
