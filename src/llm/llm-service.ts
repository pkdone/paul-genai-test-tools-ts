import path from 'path';
import { fileSystemConfig } from "../config/fileSystem.config";
import { LLMProviderImpl, LLMModelInternalKeysSet as LLMModelsInternalKeysSet, LLMModelMetadata, ResolvedLLMModelMetadata } from "../types/llm.types";
import { EnvVars } from "../types/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { LLMProviderManifest } from "./providers/llm-provider.types";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { readDirContents } from "../utils/fs-utils";

/**
 * Service for managing LLM providers using auto-discovery of manifests
 */
export class LLMService {
  private readonly providerRegistry: Map<string, LLMProviderManifest>;
  private isInitialized = false;

  /**
   * Constructor for dependency injection pattern
   */
  constructor() { 
    this.providerRegistry = new Map();
  }

  /**
   * Initialize the service (async initialization)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn("LLMService is already initialized.");
      return;
    }
    await this.initializeRegistry();
    this.isInitialized = true;
  }

  /**
   * Get a provider manifest by model family
   */
  getLLMManifest(modelFamily: string): LLMProviderManifest | undefined {
    if (!this.isInitialized) {
      throw new Error("LLMService is not initialized. Call initialize() first.");
    }
    return this.providerRegistry.get(modelFamily);
  }

  /**
   * Get an LLM provider instance for the given model family and environment
   */
  getLLMProviderInstance(modelFamily: string, env: EnvVars): LLMProviderImpl {
    if (!this.isInitialized) throw new Error("LLMService is not initialized. Call initialize() first.");
    const llmProviderManifest = this.providerRegistry.get(modelFamily);
    if (!llmProviderManifest) throw new BadConfigurationLLMError(`No provider manifest found for model family: ${modelFamily}`);
    const modelsInternallKeySet = this.constructModelsInternalKeysSet(llmProviderManifest);
    const modelsMetadata = this.constructModelsMetadata(llmProviderManifest, env);
    const llmProvider = llmProviderManifest.factory(env, modelsInternallKeySet, modelsMetadata, llmProviderManifest.errorPatterns, llmProviderManifest.providerSpecificConfig);
    return llmProvider;
  }

  /**
   * Get an LLM provider instance using the environment's LLM setting
   */
  getLLMProvider(env: EnvVars): LLMProviderImpl {
    return this.getLLMProviderInstance(env.LLM, env);
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
  private constructModelsMetadata(llmProviderManifest: LLMProviderManifest, env: EnvVars): Record<string, ResolvedLLMModelMetadata> {
    const metadata: Record<string, ResolvedLLMModelMetadata> = {};
    
    // Helper function to resolve URN from environment variable key
    const resolveUrn = (model: LLMModelMetadata): string => {
      const value = env[model.urnEnvKey] as string;
      if (!value) {
        throw new BadConfigurationLLMError(`Required environment variable ${model.urnEnvKey} is not set`);
      }
      return value;
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
