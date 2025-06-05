import { MongoClient } from 'mongodb';
import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import { gracefulShutdown } from "./graceful-shutdown";
import LLMRouter from "../llm/llm-router";
import { LLMService } from "../llm/llm-service";
import { bootstrapBaseEnv, bootstrapWithLLM, bootstrapWithMongoDB, bootstrapWithLLMAndMongoDB } 
       from "./bootstrap-startup";
import { Service, ServiceRunnerConfig, ServiceFactory, ServiceDependencies } from "../types/service.types";
import { EnvVars } from "../types/env.types";

/**
 * Unified bootstrap result type that covers all possible bootstrap scenarios.
 */
interface BootstrapResult {
  env: EnvVars;
  mongoClient?: MongoClient;
  llmRouter?: LLMRouter;
  mongoDBClientFactory?: MongoDBClientFactory;
  llmService?: LLMService;
}

/**
 * Bootstrap appropriate resources based on service requirements.
 */
async function bootstrap(config: ServiceRunnerConfig): Promise<BootstrapResult> {
  console.log(`START: ${new Date().toISOString()}`);

  if (config.requiresMongoDB && config.requiresLLM) {
    return await bootstrapWithLLMAndMongoDB() as BootstrapResult;
  } else if (config.requiresLLM) {
    return await bootstrapWithLLM() as BootstrapResult;
  } else if (config.requiresMongoDB) {
    return await bootstrapWithMongoDB() as BootstrapResult;
  } else {
    return bootstrapBaseEnv() as BootstrapResult;
  }
}

/**
 * Generic service runner function that handles the common CLI pattern:
 * 1. Bootstrap appropriate resources
 * 2. Create and execute service
 * 3. Handle graceful shutdown
 */
export async function runService<T extends Service>(
  serviceFactory: ServiceFactory<T>,
  config: ServiceRunnerConfig
): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;
  
  try {
    // Bootstrap appropriate resources based on config
    const bootstrapResult = await bootstrap(config);
    mongoDBClientFactory = bootstrapResult.mongoDBClientFactory;
    llmRouter = bootstrapResult.llmRouter;
    
    // Create service dependencies
    const dependencies: ServiceDependencies = {
      mongoClient: bootstrapResult.mongoClient,
      llmRouter: bootstrapResult.llmRouter,
      env: bootstrapResult.env
    };
    
    // Create and execute service
    const service = serviceFactory(dependencies);
    await service.execute();
    
  } finally {
    // Clean up resources
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
} 