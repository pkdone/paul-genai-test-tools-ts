import path from 'path';
import { fileSystemConfig } from "../config/fileSystem.config";
import { ModelFamily } from "../types/llm-models-types";
import { LLMProviderImpl, LLMModelSet, LLMModelMetadata } from "../types/llm-types";
import { EnvVars } from "../types/env-types";
import { BadConfigurationLLMError } from "../types/llm-errors";
import { LLMProviderManifest } from "./providers/llm-provider.types";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { readDirContents } from "../utils/fs-utils";

/**
 * Service for managing LLM providers using auto-discovery of manifests
 */
class LLMService {
  private readonly providerRegistry: Map<ModelFamily, LLMProviderManifest>;
  private isInitialized = false;

  /**
   * Private constructor for async factory pattern
   */
  private constructor() { 
    this.providerRegistry = new Map();
  }

  /**
   * Create an LLMService instance
   */
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
    if (!this.isInitialized) throw new Error("LLMService is not initialized. Call LLMService.create() first.");
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
    const providersRootPath = path.join(__dirname, fileSystemConfig.PROVIDERS_FOLDER_NAME);
    
    try {
      await this.loadProviderManifests(providersRootPath);      
      if (this.providerRegistry.size === 0) console.warn("LLMService: No LLM provider manifests were loaded. Check paths and manifest exports in 'src/llm/providers/*/*/*.manifest.ts'.");
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to read providers root directory ${providersRootPath}`, error);
    }
  }
  
  /**
   * Load provider manifests from the given directory path
   */
  private async loadProviderManifests(rootPath: string): Promise<void> {
    const providerGroupDirs = await readDirContents(rootPath);
    
    for (const groupDir of providerGroupDirs) {
      if (!groupDir.isDirectory()) continue;
      const groupPath = path.join(rootPath, groupDir.name);
      await this.loadProviderGroups(groupPath);
    }
  }
  
  /**
   * Load provider implementations from a provider group directory
   */
  private async loadProviderGroups(groupPath: string): Promise<void> {
    try {
      const providerImplDirs = await readDirContents(groupPath);
      
      for (const implDir of providerImplDirs) {
        if (!implDir.isDirectory()) continue;        
        const implPath = path.join(groupPath, implDir.name);
        await this.loadProviderImpl(implPath);
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to read provider group directory ${groupPath}`, error);
    }
  }
  
  /**
   * Load a specific provider implementation manifest
   */
  private async loadProviderImpl(implPath: string): Promise<void> {
    try {
      const filesInImplDir = await readDirContents(implPath);
      const llmManifestFile = filesInImplDir
        .filter(file => file.isFile())
        .find(file => file.name.endsWith(fileSystemConfig.MANIFEST_FILE_SUFFIX));        
      if (!llmManifestFile) return;      
      const llmManifestPath = path.join(implPath, llmManifestFile.name);
      await this.importAndRegisterManifest(llmManifestPath);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to load manifest from ${implPath}`, error);
    }
  }
  
  /**
   * Import and register a manifest from the given path
   */
  private async importAndRegisterManifest(manifestPath: string): Promise<void> {
    const module: unknown = await import(manifestPath);    
    if (!module || typeof module !== 'object') return;
    const llmManifestKey = Object.keys(module).find(key => 
      key.endsWith(fileSystemConfig.PROVIDER_MANIFEST_KEY));
      
    if (!llmManifestKey || !(llmManifestKey in module)) {
      console.warn(`Could not find an exported manifest in ${manifestPath}`);
      return;
    }
    
    const manifestValue = (module as Record<string, unknown>)[llmManifestKey];
    
    if (this.isLlmValidManifest(manifestValue)) {
      this.providerRegistry.set(manifestValue.modelFamily, manifestValue);
      console.log(`Registered LLM provider: ${manifestValue.providerName}`);
    } else {
      console.warn(`Manifest ${manifestPath} is not a valid LLMProviderManifest.`);
    }
  }

  /**
   * Type guard to validate if a value is a valid LLMProviderManifest
   */
  private isLlmValidManifest(value: unknown): value is LLMProviderManifest {
    return value !== null && 
           typeof value === 'object' && 
           'modelFamily' in value && 
           'factory' in value &&
           typeof (value as Record<string, unknown>).factory === 'function';
  }

  /**
   * Validate that all required environment variables are present
   */
  private validateEnvironmentVariables(llmManifest: LLMProviderManifest, env: EnvVars): void {
    for (const envVarName of llmManifest.envVarNames) {
      if (!(envVarName in env) || !env[envVarName as keyof EnvVars]) {
        throw new BadConfigurationLLMError(
          `Required environment variable '${envVarName}' is missing for provider '${llmManifest.providerName}'`
        );
      }
    }
  }

  /**
   * Construct LLMModelSet from manifest
   */
  private constructModelSet(llmManifest: LLMProviderManifest): LLMModelSet {
    const modelSet: LLMModelSet = {
      embeddings: llmManifest.models.embeddings.key,
      primaryCompletion: llmManifest.models.primaryCompletion.key,
    };

    if (llmManifest.models.secondaryCompletion) {
      modelSet.secondaryCompletion = llmManifest.models.secondaryCompletion.key;
    }

    return modelSet;
  }

  /**
   * Construct LLMModelMetadata record from manifest
   */
  private constructModelsMetadata(llmManifest: LLMProviderManifest): Record<string, LLMModelMetadata> {
    const metadata: Record<string, LLMModelMetadata> = {};
    metadata[llmManifest.models.embeddings.key] = llmManifest.models.embeddings;
    metadata[llmManifest.models.primaryCompletion.key] = llmManifest.models.primaryCompletion;
    
    if (llmManifest.models.secondaryCompletion) {
      metadata[llmManifest.models.secondaryCompletion.key] = llmManifest.models.secondaryCompletion;
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
