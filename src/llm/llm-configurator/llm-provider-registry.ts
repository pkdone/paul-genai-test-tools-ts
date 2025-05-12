import { ModelFamily } from "../../types/llm-models-metadata";
import { EnvVars } from "../../types/env-types";
import { LLMModelSet, LLMProviderImpl } from "../../types/llm-types";

/**
 * Type to define the factory function for creating LLM provider implementations.
 */
export type LLMProviderFactory = (env: EnvVars, models: LLMModelSet) => LLMProviderImpl;

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
  private readonly providers: Map<ModelFamily, LLMProviderFactory>;

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
   * Registers a provider factory for a specific model family.
   */
  registerProvider(family: ModelFamily, factory: LLMProviderFactory): void {
    this.providers.set(family, factory);
  }

  /**
   * Retrieves a provider factory for a given model family.
   */
  getProvider(family: ModelFamily): LLMProviderFactory | undefined {
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