import "reflect-metadata";
import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import { gracefulShutdown } from "./env";
import LLMRouter from "../llm/llm-router";
import { Service, ServiceRunnerConfig } from "../types/service.types";
import { diContainer } from "../di/container";
import { TOKENS } from "../di/tokens";

/**
 * Generic service runner function that handles the common CLI pattern:
 * 1. Bootstrap appropriate resources based on service requirements using DI container
 * 2. Create and execute service using DI container
 * 3. Handle graceful shutdown
 */
export async function runService(
  serviceToken: symbol,
  config: ServiceRunnerConfig
): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;
  
  try {    
    // Register dependencies in the DI container
    console.log(`START: ${new Date().toISOString()}`);
    await diContainer.registerDependencies(config);
    
    // Resolve dependencies for cleanup
    if (config.requiresMongoDB) {
      mongoDBClientFactory = diContainer.resolve(TOKENS.MongoDBClientFactory) as MongoDBClientFactory;
    }
    if (config.requiresLLM) {
      llmRouter = diContainer.resolve(TOKENS.LLMRouter) as LLMRouter;
    }
    
         // Resolve and execute service
     const service = diContainer.resolve(serviceToken) as Service;
     await service.execute();    
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
} 