import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import LLMRouter from "../llm/llm-router";
import { LLMService } from "../llm/llm-service";
import { EnvVars } from "../types/env.types";
import { ServiceRunnerConfig } from "../types/service.types";
import databaseConfig from "../config/database.config";
import dotenv from "dotenv";
import { z } from "zod";
import { baseEnvVarsSchema } from "../types/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { getErrorStack } from "../utils/error-utils";
import { loadBaseEnvVarsOnly } from "../lifecycle/bootstrap-startup";
import { CodebaseCaptureService } from "../services/codebase-capture.service";
import { CodeQueryService } from "../services/code-query.service";
import { InsightGenerationService } from "../services/insight-generation.service";
import { InlineInsightsService } from "../services/inline-insights.service";
import { MongoDBConnectionTestService } from "../services/mongodb-connection-test.service";
import { LLMTestService } from "../services/llm-test.service";

/**
 * DI Container service for managing dependency registration and resolution.
 */
export class DIContainer {
  private static instance: DIContainer | undefined;
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
  
  /**
   * Get the singleton instance of the DI container.
   */
  static getInstance(): DIContainer {
    DIContainer.instance ??= new DIContainer();
    return DIContainer.instance;
  }
  
  /**
   * Register dependencies based on service configuration.
   */
  async registerDependencies(config: ServiceRunnerConfig): Promise<void> {
    console.log(`Registering dependencies for service with config:`, config);
    
    // Register environment variables first
    const envVars = await this.loadEnvironmentVars(config.requiresLLM);
    container.registerInstance(TOKENS.EnvVars, envVars);
    
    // Register LLM dependencies if required
    if (config.requiresLLM) {
      const llmService = new LLMService();
      await llmService.initialize();
      container.registerInstance(TOKENS.LLMService, llmService);
      const llmProvider = llmService.getLLMProvider(envVars);
      const llmManifest = llmService.getLLMManifest(envVars.LLM);
      const retryConfig = llmManifest?.providerSpecificConfig;
      const llmRouter = new LLMRouter(llmProvider, retryConfig);
      container.registerInstance(TOKENS.LLMRouter, llmRouter);
    }
    
    // Register MongoDB dependencies if required
    if (config.requiresMongoDB) {
      const mongoDBClientFactory = new MongoDBClientFactory();
      container.registerInstance(TOKENS.MongoDBClientFactory, mongoDBClientFactory);
      const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, envVars.MONGODB_URL);
      container.registerInstance(TOKENS.MongoClient, mongoClient);
    }
    
    // Register services
    container.register(TOKENS.CodebaseCaptureService, { useClass: CodebaseCaptureService });
    container.register(TOKENS.CodeQueryService, { useClass: CodeQueryService });
    container.register(TOKENS.InsightGenerationService, { useClass: InsightGenerationService });
    container.register(TOKENS.InlineInsightsService, { useClass: InlineInsightsService });
    container.register(TOKENS.MongoDBConnectionTestService, { useClass: MongoDBConnectionTestService });
    container.register(TOKENS.LLMTestService, { useClass: LLMTestService });
  }
  
  /**
   * Resolve a dependency from the container.
   */
  resolve(token: symbol): unknown {
    return container.resolve(token);
  }
  
  /**
   * Clear all registered dependencies (useful for testing).
   */
  clearContainer(): void {
    container.clearInstances();
  }
  
  /**
   * Load environment variables based on whether LLM is required.
   */
  private async loadEnvironmentVars(requiresLLM: boolean): Promise<EnvVars> {
    if (requiresLLM) {
      return await this.loadEnvIncludingLLMVars();
    } else {
      return loadBaseEnvVarsOnly();
    }
  }
  
  /**
   * Load environment variables including LLM-specific ones.
   */
  private async loadEnvIncludingLLMVars(): Promise<EnvVars> {
    try {
      dotenv.config();
      const LlmSelectorSchema = z.object({ LLM: z.string().optional() });
      const rawEnv = process.env;

      const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
      if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) {
        throw new Error("LLM environment variable is not set or is empty in your .env file.");
      }
      const selectedLlmModelFamily = selectedLlmContainer.data.LLM;

      // Create a temporary LLMService instance to get the manifest
      // We can't resolve from container yet since we're still in the registration phase
      const tempLlmService = new LLMService();
      await tempLlmService.initialize();
      const manifest = tempLlmService.getLLMManifest(selectedLlmModelFamily);
      if (!manifest) {
        throw new Error(`No provider manifest found for LLM: '${selectedLlmModelFamily}'`);
      }

      const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();
      const parsedEnv = finalSchema.parse(rawEnv);

      if (parsedEnv.LLM !== manifest.modelFamily) {
        throw new BadConfigurationLLMError(
          `Warning: LLM environment variable ('${parsedEnv.LLM}') does not precisely match ` +
          `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `
        );
      }

      return parsedEnv as EnvVars;
    } catch (error) {
      if (error instanceof BadConfigurationLLMError) throw error;
      throw new BadConfigurationLLMError("Failed to load and validate environment variables for LLM configuration", getErrorStack(error));
    }
  }
}

/**
 * Export the singleton instance for easy access.
 */
export const diContainer = DIContainer.getInstance(); 