import { EnvVars } from "../../types/env-types";
import { llmProviderRegistry } from "./llm-provider-registry";
import { BadConfigurationLLMError } from "../../types/llm-errors";
import { LLMProviderImpl } from "../../types/llm-types";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "../llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llms-impl/bedrock/bedrock-deepseek-llm";

/**
 * Class responsible for initializing and providing LLM implementations
 * based on environment configuration.
 */
export class LLMInitializer {
  /**
   * Ensure that all LLM providers are registered.
   * Private constructor to enforce singleton pattern.
   */
  constructor() {
    llmProviderRegistry.registerProvider(ModelFamily.OPENAI_MODELS, (env, models) => 
      new OpenAILLM(models, env.OPENAI_LLM_API_KEY)
    );    
    llmProviderRegistry.registerProvider(ModelFamily.AZURE_OPENAI_MODELS, (env, models) => 
      new AzureOpenAILLM(models, env.AZURE_LLM_API_KEY, env.AZURE_API_ENDPOINT,
                         env.AZURE_API_EMBEDDINGS_MODEL, env.AZURE_API_COMPLETIONS_MODEL_PRIMARY,
                         env.AZURE_API_COMPLETIONS_MODEL_SECONDARY)
    );    
    llmProviderRegistry.registerProvider(ModelFamily.VERTEXAI_GEMINI_MODELS, (env, models) => 
      new VertexAIGeminiLLM(models, env.GCP_API_PROJECTID, env.GCP_API_LOCATION)
    );    
    llmProviderRegistry.registerProvider(ModelFamily.BEDROCK_TITAN_MODELS, (_env, models) => 
      new BedrockTitanLLM(models)
    );
    llmProviderRegistry.registerProvider(ModelFamily.BEDROCK_CLAUDE_MODELS, (_env, models) => 
      new BedrockClaudeLLM(models)
    );
    llmProviderRegistry.registerProvider(ModelFamily.BEDROCK_LLAMA_MODELS, (_env, models) => 
      new BedrockLlamaLLM(models)
    );
    llmProviderRegistry.registerProvider(ModelFamily.BEDROCK_MISTRAL_MODELS, (_env, models) => 
      new BedrockMistralLLM(models)
    );
    llmProviderRegistry.registerProvider(ModelFamily.BEDROCK_NOVA_MODELS, (_env, models) => 
      new BedrockNovaLLM(models)
    );
    llmProviderRegistry.registerProvider(ModelFamily.BEDROCK_DEEPSEEK_MODELS, (_env, models) => 
      new BedrockDeepseekLLM(models)
    );
  }

  /**
   * Initialize and return the appropriate LLM implementation based on environment variables.
   * 
   * @param env The loaded environment variables
   * @returns The appropriate LLM provider implementation
   */
  getLLMImplementation(env: EnvVars): LLMProviderImpl {
    const modelFamily = env.LLM as ModelFamily;
    const models = modelProviderMappings[modelFamily];
    const factory = llmProviderRegistry.getProvider(modelFamily);
    if (!factory) throw new BadConfigurationLLMError(`Unsupported LLM family: ${modelFamily}`);
    return factory(env, models);
  }
}

export default LLMInitializer;