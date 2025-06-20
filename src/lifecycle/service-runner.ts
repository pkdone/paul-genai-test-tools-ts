import "reflect-metadata";
import { MongoDBClientFactory } from "../mdb/mdb-client-factory";
import { gracefulShutdown } from "./env";
import LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import { registerDependencies, container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { getServiceConfiguration } from "../di/registration-modules/service-config-registration";

/**
 * Generic service runner function that handles the common CLI pattern:
 * 1. Resolve service configuration from DI container based on service token
 * 2. Bootstrap appropriate resources based on service requirements using DI container
 * 3. Create and execute service using DI container
 * 4. Handle graceful shutdown
 */
export async function runService(serviceToken: symbol): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;
  
  try {    
    console.log(`START: ${new Date().toISOString()}`);
    const config = getServiceConfiguration(serviceToken);
    console.log(`Service configuration resolved:`, config);    
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