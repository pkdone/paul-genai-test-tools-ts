import { ModelFamily } from "../../types/llm-models-metadata";
import { LLMProviderImpl } from "../../types/llm-types";
import { 
  LLMProviderConfig, 
  OpenAIProviderConfig, 
  AzureOpenAIProviderConfig, 
  VertexAIGeminiProviderConfig,
  BedrockProviderConfig
} from "../../types/llm-provider-config";

/**
 * Type to define the factory function for creating LLM provider implementations.
 */
export type LLMProviderFactory<T extends LLMProviderConfig> = (config: T) => LLMProviderImpl;

/**
 * Registry for LLM providers using the Singleton pattern.
 * Manages the registration and retrieval of provider factories for different model families.
 */
class LLMProviderRegistry {
  /**
   * Singleton instance of the registry.
   */
  private static readonly instance = new LLMProviderRegistry();
  
  /**
   * Map storing provider factories indexed by model family.
   */
  private readonly providers: Map<ModelFamily, LLMProviderFactory<LLMProviderConfig>>;

  /**
   * Private constructor to prevent direct instantiation.
   * Initializes the providers map.
   */
  private constructor() {
    this.providers = new Map();
  }

  /**
   * Returns the singleton instance of the registry.
   */
  static getInstance(): LLMProviderRegistry {
    return LLMProviderRegistry.instance;
  }

  /**
   * Registers a provider factory for OpenAI models.
   */
  registerOpenAIProvider(factory: LLMProviderFactory<OpenAIProviderConfig>): void {
    this.providers.set(ModelFamily.OPENAI_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Azure OpenAI models.
   */
  registerAzureOpenAIProvider(factory: LLMProviderFactory<AzureOpenAIProviderConfig>): void {
    this.providers.set(ModelFamily.AZURE_OPENAI_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for VertexAI Gemini models.
   */
  registerVertexAIGeminiProvider(factory: LLMProviderFactory<VertexAIGeminiProviderConfig>): void {
    this.providers.set(ModelFamily.VERTEXAI_GEMINI_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Bedrock Titan models.
   */
  registerBedrockTitanProvider(factory: LLMProviderFactory<BedrockProviderConfig>): void {
    this.providers.set(ModelFamily.BEDROCK_TITAN_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Bedrock Claude models.
   */
  registerBedrockClaudeProvider(factory: LLMProviderFactory<BedrockProviderConfig>): void {
    this.providers.set(ModelFamily.BEDROCK_CLAUDE_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Bedrock Llama models.
   */
  registerBedrockLlamaProvider(factory: LLMProviderFactory<BedrockProviderConfig>): void {
    this.providers.set(ModelFamily.BEDROCK_LLAMA_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Bedrock Mistral models.
   */
  registerBedrockMistralProvider(factory: LLMProviderFactory<BedrockProviderConfig>): void {
    this.providers.set(ModelFamily.BEDROCK_MISTRAL_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Bedrock Nova models.
   */
  registerBedrockNovaProvider(factory: LLMProviderFactory<BedrockProviderConfig>): void {
    this.providers.set(ModelFamily.BEDROCK_NOVA_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Registers a provider factory for Bedrock Deepseek models.
   */
  registerBedrockDeepseekProvider(factory: LLMProviderFactory<BedrockProviderConfig>): void {
    this.providers.set(ModelFamily.BEDROCK_DEEPSEEK_MODELS, factory as LLMProviderFactory<LLMProviderConfig>);
  }

  /**
   * Retrieves a provider factory for a given model family.
   */
  getProvider(family: ModelFamily): LLMProviderFactory<LLMProviderConfig> | undefined {
    return this.providers.get(family);
  }

  /**
   * Checks if a provider exists for a specific model family.
   */
  hasProvider(family: ModelFamily): boolean {
    return this.providers.has(family);
  }
}

/**
 * Exported singleton instance of the LLM provider registry.
 */
export const llmProviderRegistry = LLMProviderRegistry.getInstance(); 