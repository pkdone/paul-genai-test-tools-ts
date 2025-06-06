import path from 'path';
import { fileSystemConfig } from "../config/fileSystem.config";
import { LLMProviderImpl, LLMModelInternalKeysSet as LLMModelsInternalKeysSet, LLMModelMetadata, ResolvedLLMModelMetadata } from "../types/llm.types";
import { EnvVars } from "../types/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { LLMProviderManifest } from "./providers/llm-provider.types";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { readDirContents } from "../utils/fs-utils";

/**
 * Service for managing a single LLM provider
 */
export class LLMService {
  private manifest?: LLMProviderManifest;
  private readonly modelFamily: string;
  private isInitialized = false;

  /**
   * Constructor for dependency injection pattern
   * @param modelFamily - The specific model family to load
   */
  constructor(modelFamily: string) { 
    this.modelFamily = modelFamily;
  }

  /**
   * Static method to load a manifest for a specific model family without creating a full service
   */
  static async loadManifestForModelFamily(modelFamily: string): Promise<LLMProviderManifest> {
    const providersRootPath = path.join(__dirname, fileSystemConfig.PROVIDERS_FOLDER_NAME);
    const manifest = await LLMService.loadSpecificProviderStatic(providersRootPath, modelFamily);
    
    if (!manifest) {
      throw new BadConfigurationLLMError(`No provider manifest found for model family: ${modelFamily}`);
    }
    
    return manifest;
  }

  /**
   * Static version of loadSpecificProvider for use without instance
   */
  private static async loadSpecificProviderStatic(rootPath: string, targetModelFamily: string): Promise<LLMProviderManifest | undefined> {
    try {
      const providerGroupDirs = await readDirContents(rootPath);
      
      for (const groupDir of providerGroupDirs) {
        if (!groupDir.isDirectory()) continue;
        const groupPath = path.join(rootPath, groupDir.name);
        
        const manifest = await LLMService.loadProviderGroupsForSpecific(groupPath, targetModelFamily);
        if (manifest) return manifest;
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to read providers root directory ${rootPath}`, error);
    }
    
    return undefined;
  }
  
  /**
   * Load provider implementations from a provider group directory, searching for specific model family
   */
  private static async loadProviderGroupsForSpecific(groupPath: string, targetModelFamily: string): Promise<LLMProviderManifest | undefined> {
    try {
      const providerImplDirs = await readDirContents(groupPath);
      
      for (const implDir of providerImplDirs) {
        if (!implDir.isDirectory()) continue;        
        const implPath = path.join(groupPath, implDir.name);
        const manifest = await LLMService.loadProviderImplForSpecific(implPath, targetModelFamily);
        if (manifest) {
          return manifest;
        }
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to read provider group directory ${groupPath}`, error);
    }
    
    return undefined;
  }
  
  /**
   * Load a specific provider implementation manifest if it matches the target model family
   */
  private static async loadProviderImplForSpecific(implPath: string, targetModelFamily: string): Promise<LLMProviderManifest | undefined> {
    try {
      const filesInImplDir = await readDirContents(implPath);
      const llmProviderManifestFile = filesInImplDir
        .filter(file => file.isFile())
        .find(file => file.name.endsWith(fileSystemConfig.MANIFEST_FILE_SUFFIX));        
      if (!llmProviderManifestFile) return undefined;      
      const llmProviderManifestPath = path.join(implPath, llmProviderManifestFile.name);
      return await LLMService.importSpecificManifest(llmProviderManifestPath, targetModelFamily);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to load manifest from ${implPath}`, error);
      return undefined;
    }
  }
  
  /**
   * Import a manifest from the given path if it matches the target model family
   */
  private static async importSpecificManifest(manifestPath: string, targetModelFamily: string): Promise<LLMProviderManifest | undefined> {
    const module: unknown = await import(manifestPath);    
    if (!module || typeof module !== 'object') return undefined;
    const llmProviderManifestKey = Object.keys(module).find(key => 
      key.endsWith(fileSystemConfig.PROVIDER_MANIFEST_KEY));
      
    if (!llmProviderManifestKey || !(llmProviderManifestKey in module)) {
      return undefined;
    }
    
    const manifestValue = (module as Record<string, unknown>)[llmProviderManifestKey];
    
    if (LLMService.isLlmValidManifest(manifestValue)) {
      // Only return if this matches our target model family
      if (manifestValue.modelFamily === targetModelFamily) {
        return manifestValue;
      }
    }
    
    return undefined;
  }

  /**
   * Type guard to validate if a value is a valid LLMProviderManifest
   */
  private static isLlmValidManifest(value: unknown): value is LLMProviderManifest {
    return value !== null && 
           typeof value === 'object' && 
           'modelFamily' in value && 
           'factory' in value &&
           typeof (value as Record<string, unknown>).factory === 'function';
  }

  /**
   * Initialize the service (async initialization)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn("LLMService is already initialized.");
      return;
    }
    
    const providersRootPath = path.join(__dirname, fileSystemConfig.PROVIDERS_FOLDER_NAME);
    this.manifest = await this.loadSpecificProvider(providersRootPath, this.modelFamily);
    
    if (!this.manifest) {
      throw new BadConfigurationLLMError(`Could not find provider for model family '${this.modelFamily}'. Check paths and manifest exports in 'src/llm/providers/*/*/*.manifest.ts'.`);
    }
    
    console.log(`LLMService: Loaded provider for model family '${this.modelFamily}': ${this.manifest.providerName}`);
    this.isInitialized = true;
  }

  /**
   * Get the loaded provider manifest
   */
  getLLMManifest(): LLMProviderManifest {
    if (!this.isInitialized || !this.manifest) {
      throw new Error("LLMService is not initialized. Call initialize() first.");
    }
    return this.manifest;
  }

  /**
   * Get an LLM provider instance using the loaded manifest and environment
   */
  getLLMProvider(env: EnvVars): LLMProviderImpl {
    if (!this.isInitialized || !this.manifest) {
      throw new Error("LLMService is not initialized. Call initialize() first.");
    }
    
    const modelsInternallKeySet = this.constructModelsInternalKeysSet(this.manifest);
    const modelsMetadata = this.constructModelsMetadata(this.manifest, env);
    const llmProvider = this.manifest.factory(env, modelsInternallKeySet, modelsMetadata, this.manifest.errorPatterns, this.manifest.providerSpecificConfig);
    return llmProvider;
  }

  /**
   * Load only the specific provider that matches the given model family
   */
  private async loadSpecificProvider(rootPath: string, targetModelFamily: string): Promise<LLMProviderManifest | undefined> {
    return LLMService.loadSpecificProviderStatic(rootPath, targetModelFamily);
  }

  /**
   * Construct LLMModelSet from manifest
   */
  private constructModelsInternalKeysSet(llmProviderManifest: LLMProviderManifest): LLMModelsInternalKeysSet {
    const modelsInternallKeySet: LLMModelsInternalKeysSet = {
      embeddingsInternalKey: llmProviderManifest.models.embeddings.internalKey,
      primaryCompletionInternalKey: llmProviderManifest.models.primaryCompletion.internalKey,
    };

    if (llmProviderManifest.models.secondaryCompletion) {
      modelsInternallKeySet.secondaryCompletionInternalKey = llmProviderManifest.models.secondaryCompletion.internalKey;
    }

    return modelsInternallKeySet;
  }

  /**
   * Construct LLMModelMetadata record from manifest
   */
  private constructModelsMetadata(llmProviderManifest: LLMProviderManifest, env: EnvVars): Record<string, ResolvedLLMModelMetadata> {
    const metadata: Record<string, ResolvedLLMModelMetadata> = {};
    
    // Helper function to resolve URN from environment variable key
    const resolveUrn = (model: LLMModelMetadata): string => {
      const value = env[model.urnEnvKey];

      if (typeof value !== 'string' || value.length === 0) { // Type guard and emptiness check
        throw new BadConfigurationLLMError(
          `Required environment variable ${model.urnEnvKey} is not set, is empty, or is not a string. Found: ${String(value)}`
        );
      }
      
      return value; // 'value' is now known to be a non-empty string
    };
    
    // Create resolved metadata for embeddings model
    const embeddingsModel = llmProviderManifest.models.embeddings;
    metadata[embeddingsModel.internalKey] = {
      ...embeddingsModel,
      urn: resolveUrn(embeddingsModel)
    };
    
    // Create resolved metadata for primary completion model
    const primaryCompletionModel = llmProviderManifest.models.primaryCompletion;
    metadata[primaryCompletionModel.internalKey] = {
      ...primaryCompletionModel,
      urn: resolveUrn(primaryCompletionModel)
    };
    
    // Create resolved metadata for secondary completion model if it exists
    if (llmProviderManifest.models.secondaryCompletion) {
      const secondaryCompletionModel = llmProviderManifest.models.secondaryCompletion;
      metadata[secondaryCompletionModel.internalKey] = {
        ...secondaryCompletionModel,
        urn: resolveUrn(secondaryCompletionModel)
      };
    }

    return metadata;
  }
} 
