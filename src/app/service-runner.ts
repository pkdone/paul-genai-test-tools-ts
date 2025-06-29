import "reflect-metadata";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { gracefulShutdown } from "./env";
import LLMRouter from "../llm/llm-router";
import { Service } from "./service.types";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { getServiceConfiguration } from "../di/registration-modules/service-config-registration";

/**
 * Generic service runner function that handles service execution:
 * 1. Resolve service configuration from DI container based on service token
 * 2. Resolve required resources from the pre-bootstrapped DI container
 * 3. Create and execute service using DI container
 * 4. Handle graceful shutdown
 * 
 * Note: This function assumes the DI container has already been bootstrapped.
 * Use bootstrapContainer() before calling this function.
 */
export async function runService(serviceToken: symbol): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;
  
  try {    
    console.log(`START: ${new Date().toISOString()}`);
    const config = getServiceConfiguration(serviceToken);
    
    if (config.requiresMongoDB) {
      mongoDBClientFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
    }
    
    if (config.requiresLLM) {
      llmRouter = await container.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
    }
    
    const service = await container.resolve<Promise<Service>>(serviceToken);
    await service.execute();    
  } finally {
    console.log(`END: ${new Date().toISOString()}`);
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
} 