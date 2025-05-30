import { ModelFamily } from "../types/llm-models-types";
import { LLMProviderImpl, LLMModelSet, LLMModelMetadata } from "../types/llm-types";
import { EnvVars } from "../types/env-types";
import { BadConfigurationLLMError } from "../types/llm-errors";
import { allProviderManifests } from "./providers";
import { LLMProviderManifest, LLMProviderModelInfo } from "./providers/llm-provider-manifest.types";

/**
 * Service for managing LLM providers using a registry-based approach
 */
class LLMService {
  private readonly providerRegistry: Map<ModelFamily, LLMProviderManifest>;

  constructor() {
    this.providerRegistry = new Map();
    this.initializeRegistry();
  }

  /**
   * Get an LLM provider instance for the given model family and environment
   */
  getLlmProviderInstance(modelFamily: ModelFamily, env: EnvVars): { llmProvider: LLMProviderImpl, modelsMetadata: Record<string, LLMModelMetadata> } {
    const manifest = this.providerRegistry.get(modelFamily);
    if (!manifest) throw new BadConfigurationLLMError(`No provider manifest found for model family: ${modelFamily}`);
    this.validateEnvironmentVariables(manifest, env);
    const modelSet = this.constructModelSet(manifest);
    const modelsMetadata = this.constructModelsMetadata(manifest);
    const llmProvider = manifest.factory(env, modelSet, modelsMetadata, manifest.errorPatterns);
    return { llmProvider, modelsMetadata };
  }

  /**
   * Initialize the provider registry with all available manifests
   */
  private initializeRegistry(): void {
    for (const manifest of allProviderManifests) {
      this.providerRegistry.set(manifest.modelFamily, manifest);
    }
  }

  /**
   * Validate that all required environment variables are present
   */
  private validateEnvironmentVariables(manifest: LLMProviderManifest, env: EnvVars): void {
    for (const envVarName of manifest.envVarNames) {
      if (!(envVarName in env) || !env[envVarName as keyof EnvVars]) {
        throw new BadConfigurationLLMError(
          `Required environment variable '${envVarName}' is missing for provider '${manifest.providerName}'`
        );
      }
    }
  }

  /**
   * Construct LLMModelSet from manifest
   */
  private constructModelSet(manifest: LLMProviderManifest): LLMModelSet {
    const modelSet: LLMModelSet = {
      embeddings: manifest.models.embeddings.key,
      primaryCompletion: manifest.models.primaryCompletion.key,
    };

    if (manifest.models.secondaryCompletion) {
      modelSet.secondaryCompletion = manifest.models.secondaryCompletion.key;
    }

    return modelSet;
  }

  /**
   * Construct LLMModelMetadata record from manifest
   */
  private constructModelsMetadata(manifest: LLMProviderManifest): Record<string, LLMModelMetadata> {
    const metadata: Record<string, LLMModelMetadata> = {};
    metadata[manifest.models.embeddings.key] = this.convertModelInfoToMetadata(
      manifest.models.embeddings,
    );
    metadata[manifest.models.primaryCompletion.key] = this.convertModelInfoToMetadata(
      manifest.models.primaryCompletion,
    );
    if (manifest.models.secondaryCompletion) {
      metadata[manifest.models.secondaryCompletion.key] = this.convertModelInfoToMetadata(
        manifest.models.secondaryCompletion,
      );
    }

    return metadata;
  }

  /**
   * Convert LLMProviderModelInfo to LLMModelMetadata
   */
  private convertModelInfoToMetadata(
    modelInfo: LLMProviderModelInfo,
  ): LLMModelMetadata {
    return {
      urn: modelInfo.urn,
      purpose: modelInfo.purpose,
      dimensions: modelInfo.dimensions,
      maxCompletionTokens: modelInfo.maxCompletionTokens,
      maxTotalTokens: modelInfo.maxTotalTokens,
    };
  }
}

// Export a singleton instance
export const llmService = new LLMService();

/**
 * Get an LLM provider instance (convenience function)
 */
export function getLLMProvider(env: EnvVars): { llmProvider: LLMProviderImpl, modelsMetadata: Record<string, LLMModelMetadata> } {
  return llmService.getLlmProviderInstance(env.LLM, env);
} 