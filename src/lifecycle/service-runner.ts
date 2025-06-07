import "reflect-metadata";
import { MongoDBClientFactory } from "../mdb/mdb-client-factory";
import { gracefulShutdown } from "./env";
import LLMRouter from "../llm/llm-router";
import { Service, ServiceRunnerConfig } from "../types/service.types";
import { registerDependencies, container } from "../di/container";
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
    console.log(`START: ${new Date().toISOString()}`);
    await registerDependencies(config);
    
    if (config.requiresMongoDB) {
      mongoDBClientFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
    }
    if (config.requiresLLM) {
      llmRouter = container.resolve<LLMRouter>(TOKENS.LLMRouter);
    }
    
    const service = container.resolve<Service>(serviceToken);
    await service.execute();    
  } finally {
    console.log(`END: ${new Date().toISOString()}`);
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
} 