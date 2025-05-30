import fs from 'fs/promises';
import path from 'path';
import { ModelFamily } from "../types/llm-models-types";
import { LLMProviderImpl, LLMModelSet, LLMModelMetadata } from "../types/llm-types";
import { EnvVars } from "../types/env-types";
import { BadConfigurationLLMError } from "../types/llm-errors";
import { LLMProviderManifest } from "./providers/llm-provider.types";

/**
 * Service for managing LLM providers using auto-discovery of manifests
 */
class LLMService {
  private readonly providerRegistry: Map<ModelFamily, LLMProviderManifest>;
  private isInitialized = false;

  private constructor() { // Private constructor for async factory pattern
    this.providerRegistry = new Map();
  }

  static async create(): Promise<LLMService> {
    const service = new LLMService();
    await service.initializeRegistry();
    service.isInitialized = true;
    return service;
  }

  /**
   * Get an LLM provider instance for the given model family and environment
   */
  getLlmProviderInstance(modelFamily: ModelFamily, env: EnvVars): LLMProviderImpl {
    if (!this.isInitialized) {
      throw new Error("LLMService is not initialized. Call LLMService.create() first.");
    }
    
    const llmManifest = this.providerRegistry.get(modelFamily);
    if (!llmManifest) throw new BadConfigurationLLMError(`No provider manifest found for model family: ${modelFamily}`);
    
    this.validateEnvironmentVariables(llmManifest, env);
    const modelSet = this.constructModelSet(llmManifest);
    const modelsMetadata = this.constructModelsMetadata(llmManifest);
    const llmProvider = llmManifest.factory(env, modelSet, modelsMetadata, llmManifest.errorPatterns);
    return llmProvider;
  }

  /**
   * Auto-discover and load all provider manifests from the providers directory
   */
  private async initializeRegistry(): Promise<void> {
    const providersRootPath = path.join(__dirname, 'providers');
    
    try {
      const providerGroupDirs = await fs.readdir(providersRootPath, { withFileTypes: true });

      for (const groupDir of providerGroupDirs) {
        if (groupDir.isDirectory()) {
          const groupPath = path.join(providersRootPath, groupDir.name);
          try {
            const providerImplDirs = await fs.readdir(groupPath, { withFileTypes: true });

            for (const implDir of providerImplDirs) {
              if (implDir.isDirectory()) {
                const implPath = path.join(groupPath, implDir.name);
                try {
                  const filesInImplDir = await fs.readdir(implPath);
                  const manifestFile = filesInImplDir.find(f => f.endsWith('.manifest.js'));

                  if (manifestFile) {
                    const manifestPath = path.join(implPath, manifestFile);
                    const module: unknown = await import(manifestPath);
                    const manifestKey = module && typeof module === 'object' 
                      ? Object.keys(module).find(key => key.endsWith('ProviderManifest'))
                      : undefined;

                    if (manifestKey && module && typeof module === 'object' && manifestKey in module) {
                      const manifestValue = (module as Record<string, unknown>)[manifestKey];
                      if (this.isValidManifest(manifestValue)) {
                        const manifest = manifestValue;
                        this.providerRegistry.set(manifest.modelFamily, manifest);
                        console.log(`Registered LLM provider manifest: ${manifest.providerName}`);
                      } else {
                        console.warn(`Manifest ${manifestPath} is not a valid LLMProviderManifest.`);
                      }
                    } else {
                      console.warn(`Could not find an exported manifest in ${manifestPath}`);
                    }
                  }
                } catch (error: unknown) {
                  console.error(`Failed to load manifest from ${implPath}:`, error);
                }
              }
            }
          } catch (error: unknown) {
            console.error(`Failed to read provider group directory ${groupPath}:`, error);
          }
        }
      }

      if (this.providerRegistry.size === 0) {
        console.warn("LLMService: No LLM provider manifests were loaded. Check paths and manifest exports in 'src/llm/providers/*/*/*.manifest.ts'.");
      }
    } catch (error: unknown) {
      console.error(`Failed to read providers root directory ${providersRootPath}:`, error);
    }
  }

  /**
   * Type guard to validate if a value is a valid LLMProviderManifest
   */
  private isValidManifest(value: unknown): value is LLMProviderManifest {
    return value !== null && 
           typeof value === 'object' && 
           'modelFamily' in value && 
           'factory' in value &&
           typeof (value as Record<string, unknown>).factory === 'function';
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
    metadata[manifest.models.embeddings.key] = manifest.models.embeddings;
    metadata[manifest.models.primaryCompletion.key] = manifest.models.primaryCompletion;
    
    if (manifest.models.secondaryCompletion) {
      metadata[manifest.models.secondaryCompletion.key] = manifest.models.secondaryCompletion;
    }

    return metadata;
  }
}

// Export a factory function instead of a direct instance
export async function createLlmService(): Promise<LLMService> {
  return LLMService.create();
}

/**
 * Get an LLM provider instance (convenience function)
 */
export async function getLLMProvider(env: EnvVars): Promise<LLMProviderImpl> {
  const service = await LLMService.create();
  return service.getLlmProviderInstance(env.LLM, env);
} 