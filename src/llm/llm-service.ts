import { ModelFamily, ModelProviderType } from "../types/llm-models-types";
import { LLMProviderImpl, LLMModelSet, LLMModelMetadata, llmModelMetadataSchema, llmModelSetSchema, LLMPurpose } from "../types/llm-types";
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
  getLlmProviderInstance(modelFamily: ModelFamily, env: EnvVars): LLMProviderImpl {
    // 1. Look up the provider manifest
    const manifest = this.providerRegistry.get(modelFamily);
    if (!manifest) {
      throw new BadConfigurationLLMError(`No provider manifest found for model family: ${modelFamily}`);
    }

    // 2. Validate required environment variables
    this.validateEnvironmentVariables(manifest, env);

    // 3. Construct LLMModelSet and LLMModelMetadata
    const modelSet = this.constructModelSet(manifest);
    const modelsMetadata = this.constructModelsMetadata(manifest);

    // 4. Validate the constructed model metadata
    this.validateModelMetadata(modelsMetadata);

    // 5. Call the factory function to create the provider instance
    return manifest.factory(env, modelSet, modelsMetadata, manifest.errorPatterns);
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

    // Validate the model set
    const validationResult = llmModelSetSchema.safeParse(modelSet);
    if (!validationResult.success) {
      throw new BadConfigurationLLMError(
        `Invalid model set for provider '${manifest.providerName}': ${validationResult.error.message}`
      );
    }

    return modelSet;
  }

  /**
   * Construct LLMModelMetadata record from manifest
   */
  private constructModelsMetadata(manifest: LLMProviderManifest): Record<string, LLMModelMetadata> {
    const metadata: Record<string, LLMModelMetadata> = {};

    // Add embeddings model metadata
    metadata[manifest.models.embeddings.key] = this.convertModelInfoToMetadata(
      manifest.models.embeddings,
      LLMPurpose.EMBEDDINGS,
      manifest.modelProviderType
    );

    // Add primary completion model metadata
    metadata[manifest.models.primaryCompletion.key] = this.convertModelInfoToMetadata(
      manifest.models.primaryCompletion,
      LLMPurpose.COMPLETIONS,
      manifest.modelProviderType
    );

    // Add secondary completion model metadata if present
    if (manifest.models.secondaryCompletion) {
      metadata[manifest.models.secondaryCompletion.key] = this.convertModelInfoToMetadata(
        manifest.models.secondaryCompletion,
        LLMPurpose.COMPLETIONS,
        manifest.modelProviderType
      );
    }

    return metadata;
  }

  /**
   * Convert LLMProviderModelInfo to LLMModelMetadata
   */
  private convertModelInfoToMetadata(
    modelInfo: LLMProviderModelInfo,
    purpose: LLMPurpose,
    modelProvider: ModelProviderType
  ): LLMModelMetadata {
    return {
      id: modelInfo.id,
      purpose,
      dimensions: modelInfo.dimensions,
      maxCompletionTokens: modelInfo.maxCompletionTokens,
      maxTotalTokens: modelInfo.maxTotalTokens,
      modelProvider,
    };
  }

  /**
   * Validate model metadata using Zod schemas
   */
  private validateModelMetadata(modelsMetadata: Record<string, LLMModelMetadata>): void {
    for (const [modelKey, metadata] of Object.entries(modelsMetadata)) {
      const validationResult = llmModelMetadataSchema.safeParse(metadata);
      if (!validationResult.success) {
        throw new BadConfigurationLLMError(
          `Invalid model metadata for model '${modelKey}': ${validationResult.error.message}`
        );
      }
    }
  }
}

// Export a singleton instance
export const llmService = new LLMService();

/**
 * Get an LLM provider instance (convenience function)
 */
export function getLLMProvider(env: EnvVars): LLMProviderImpl {
  return llmService.getLlmProviderInstance(env.LLM, env);
} 