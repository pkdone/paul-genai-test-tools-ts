import { EnvVars } from "../../types/env-types";
import { llmProviderRegistry } from "./llm-provider-registry";
import { LLMProviderImpl } from "../../types/llm-types";
import { BadConfigurationLLMError } from "../../types/llm-errors";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "../llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llms-impl/bedrock/bedrock-deepseek-llm";
import { createLLMConfig } from "./llm-config-factory";
import { AzureOpenAIProviderConfig, BedrockProviderConfig, OpenAIProviderConfig, 
         VertexAIGeminiProviderConfig } from "../../types/llm-provider-config";

/**
 * Class responsible for initializing and providing LLM implementations
 * based on environment configuration.
 */
class LLMInitializer {
  /**
   * Ensure that all LLM providers are registered.
   * Private constructor to enforce singleton pattern.
   */
  constructor() {
    llmProviderRegistry.registerOpenAIProvider((config: OpenAIProviderConfig) => 
      new OpenAILLM(config.models, config.apiKey)
    );
    llmProviderRegistry.registerAzureOpenAIProvider((config: AzureOpenAIProviderConfig) => 
      new AzureOpenAILLM(config.models, config.apiKey, config.endpoint,config.embeddingsDeployment, 
        config.completionsDeploymentPrimary, config.completionsDeploymentSecondary)
    );
    llmProviderRegistry.registerVertexAIGeminiProvider((config: VertexAIGeminiProviderConfig) => 
      new VertexAIGeminiLLM(config.models, config.projectId, config.location)
    );
    llmProviderRegistry.registerBedrockTitanProvider((config: BedrockProviderConfig) => 
      new BedrockTitanLLM(config.models)
    );
    llmProviderRegistry.registerBedrockClaudeProvider((config: BedrockProviderConfig) => 
      new BedrockClaudeLLM(config.models)
    );
    llmProviderRegistry.registerBedrockLlamaProvider((config: BedrockProviderConfig) => 
      new BedrockLlamaLLM(config.models)
    );
    llmProviderRegistry.registerBedrockMistralProvider((config: BedrockProviderConfig) => 
      new BedrockMistralLLM(config.models)
    );
    llmProviderRegistry.registerBedrockNovaProvider((config: BedrockProviderConfig) => 
      new BedrockNovaLLM(config.models)
    );
    llmProviderRegistry.registerBedrockDeepseekProvider((config: BedrockProviderConfig) => 
      new BedrockDeepseekLLM(config.models)
    );
  }

  /**
   * Initialize and return the appropriate LLM implementation based on environment variables.
   * 
   * @param env The loaded environment variables
   * @returns The appropriate LLM provider implementation
   */
  getLLMImplementation(env: EnvVars): LLMProviderImpl {
    const config = createLLMConfig(env);
    const modelFamily = config.modelFamily;
    const factory = llmProviderRegistry.getProvider(modelFamily);
    if (!factory) throw new BadConfigurationLLMError(`No LLM provider found for model family: ${modelFamily}`);
    return factory(config);
  }
}

export default LLMInitializer;