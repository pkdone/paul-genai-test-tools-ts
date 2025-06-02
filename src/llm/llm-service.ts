import path from 'path';
import { fileSystemConfig } from "../config/fileSystem.config";
import { LLMProviderImpl, LLMModelInternalKeysSet as LLMModelsInternalKeysSet, LLMModelMetadata } from "../types/llm.types";
import { EnvVars } from "../types/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { LLMProviderManifest } from "./providers/llm-provider.types";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { readDirContents } from "../utils/fs-utils";

/**
 * Service for managing LLM providers using auto-discovery of manifests
 */
class LLMService {
  private readonly providerRegistry: Map<string, LLMProviderManifest>;
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
   * Get a provider manifest by model family
   */
  getLLMManifest(modelFamily: string): LLMProviderManifest | undefined {
    if (!this.isInitialized) {
      throw new Error("LLMService is not initialized. Call LLMService.create() first or use getProviderManifest().");
    }
    return this.providerRegistry.get(modelFamily);
  }

  /**
   * Get an LLM provider instance for the given model family and environment
   */
  getLLMProviderInstance(modelFamily: string, env: EnvVars): LLMProviderImpl {
    if (!this.isInitialized) throw new Error("LLMService is not initialized. Call LLMService.create() first.");
    const llmProviderManifest = this.providerRegistry.get(modelFamily);
    if (!llmProviderManifest) throw new BadConfigurationLLMError(`No provider manifest found for model family: ${modelFamily}`);
    const modelsInternallKeySet = this.constructModelsInternalKeysSet(llmProviderManifest);
    const modelsMetadata = this.constructModelsMetadata(llmProviderManifest);
    const llmProvider = llmProviderManifest.factory(env, modelsInternallKeySet, modelsMetadata, llmProviderManifest.errorPatterns);
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
      const llmProviderManifestFile = filesInImplDir
        .filter(file => file.isFile())
        .find(file => file.name.endsWith(fileSystemConfig.MANIFEST_FILE_SUFFIX));        
      if (!llmProviderManifestFile) return;      
      const llmProviderManifestPath = path.join(implPath, llmProviderManifestFile.name);
      await this.importAndRegisterManifest(llmProviderManifestPath);
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
    const llmProviderManifestKey = Object.keys(module).find(key => 
      key.endsWith(fileSystemConfig.PROVIDER_MANIFEST_KEY));
      
    if (!llmProviderManifestKey || !(llmProviderManifestKey in module)) {
      console.warn(`Could not find an exported manifest in ${manifestPath}`);
      return;
    }
    
    const manifestValue = (module as Record<string, unknown>)[llmProviderManifestKey];
    
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
  private constructModelsMetadata(llmProviderManifest: LLMProviderManifest): Record<string, LLMModelMetadata> {
    const metadata: Record<string, LLMModelMetadata> = {};
    metadata[llmProviderManifest.models.embeddings.internalKey] = llmProviderManifest.models.embeddings;
    metadata[llmProviderManifest.models.primaryCompletion.internalKey] = llmProviderManifest.models.primaryCompletion;
    
    if (llmProviderManifest.models.secondaryCompletion) {
      metadata[llmProviderManifest.models.secondaryCompletion.internalKey] = llmProviderManifest.models.secondaryCompletion;
    }

    return metadata;
  }
}

let llmServiceInstance: LLMService | null = null;
let llmServicePromise: Promise<LLMService> | null = null;

async function getLLMServiceInstance(): Promise<LLMService> {
  if (llmServiceInstance) return llmServiceInstance;

  llmServicePromise ??= LLMService.create().then(service => {
    llmServiceInstance = service;
    return service;
  });

  return llmServicePromise;
}

export async function getLLMProviderManifest(modelFamily: string): Promise<LLMProviderManifest | undefined> {
  const service = await getLLMServiceInstance();
  return service.getLLMManifest(modelFamily);
}

/**
 * Get an LLM provider instance (convenience function)
 */
export async function getLLMProvider(env: EnvVars): Promise<LLMProviderImpl> {
  const service = await getLLMServiceInstance();
  return service.getLLMProviderInstance(env.LLM, env);
} 
