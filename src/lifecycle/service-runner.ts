import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import { gracefulShutdown } from "./graceful-shutdown";
import LLMRouter from "../llm/llm-router";
import { bootstraper } from "./bootstrap-startup";
import { Service, ServiceRunnerConfig, ServiceFactory, ServiceDependencies } from "../types/service.types";

/**
 * Generic service runner function that handles the common CLI pattern:
 * 1. Bootstrap appropriate resources based on service requirements
 * 2. Create and execute service
 * 3. Handle graceful shutdown
 */
export async function runService<T extends Service>(serviceFactory: ServiceFactory<T>,
                                                    config: ServiceRunnerConfig): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;
  
  try {    
    // Bootstrap appropriate resources based on config using the unified bootstrap function
    console.log(`START: ${new Date().toISOString()}`);
    const bootstrapResult = await bootstraper(config);
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
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
} 