// filepath: /home/pdone/Projects/paul-genai-test-tools-ts/src/llm/llm-config-service.ts
import { ModelFamily } from "../../types/llm-models-metadata";
import { EnvVars } from "../../types/env-types";
import { LLMConfig, OpenAIConfig, AzureOpenAIConfig, VertexAIGeminiConfig, BedrockConfig } from "./llm-config-types";

/**
 * Service responsible for creating LLM provider-specific configuration objects
 * based on environment variables.
 */
export class LLMConfigService {
  /**
   * Creates a provider-specific configuration object based on the environment variables.
   * 
   * @param env The loaded environment variables
   * @returns A provider-specific configuration object
   */
  createLLMConfig(env: EnvVars): LLMConfig {
    const modelFamily = env.LLM;
    
    switch (modelFamily) {
      case ModelFamily.OPENAI_MODELS:
        return this.createOpenAIConfig(modelFamily, env);
      case ModelFamily.AZURE_OPENAI_MODELS:
        return this.createAzureOpenAIConfig(modelFamily, env);
      case ModelFamily.VERTEXAI_GEMINI_MODELS:
        return this.createVertexAIGeminiConfig(modelFamily, env);
      case ModelFamily.BEDROCK_TITAN_MODELS:
      case ModelFamily.BEDROCK_CLAUDE_MODELS:
      case ModelFamily.BEDROCK_LLAMA_MODELS:
      case ModelFamily.BEDROCK_MISTRAL_MODELS:
      case ModelFamily.BEDROCK_NOVA_MODELS:
      case ModelFamily.BEDROCK_DEEPSEEK_MODELS:
        return this.createBedrockConfig(modelFamily);
      default:
        throw new Error(`Unsupported model family: ${String(modelFamily)}`);
    }
  }

  private createOpenAIConfig(modelFamily: ModelFamily, env: EnvVars): OpenAIConfig {
    return {
      modelFamily,
      apiKey: env.OPENAI_LLM_API_KEY
    };
  }

  private createAzureOpenAIConfig(modelFamily: ModelFamily, env: EnvVars): AzureOpenAIConfig {
    return {
      modelFamily,
      apiKey: env.AZURE_LLM_API_KEY,
      endpoint: env.AZURE_API_ENDPOINT,
      embeddingsDeployment: env.AZURE_API_EMBEDDINGS_MODEL,
      primaryCompletionsDeployment: env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
      secondaryCompletionsDeployment: env.AZURE_API_COMPLETIONS_MODEL_SECONDARY
    };
  }

  private createVertexAIGeminiConfig(modelFamily: ModelFamily, env: EnvVars): VertexAIGeminiConfig {
    return {
      modelFamily,
      project: env.GCP_API_PROJECTID,
      location: env.GCP_API_LOCATION
    };
  }

  private createBedrockConfig(modelFamily: ModelFamily): BedrockConfig {
    return {
      modelFamily,
      _type: 'bedrock'
    };
  }
}

// Create and export a singleton instance
export const llmConfigService = new LLMConfigService();