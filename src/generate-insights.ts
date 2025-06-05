import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import LLMRouter from "./llm/llm-router";
import { InsightGenerationService } from "./services/insight-generation.service";

/**
 * Main function to run the program.
 */
async function main() {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;

  try {
    const startup = await bootstrapStartup();   
    mongoDBClientFactory = startup.mongoDBClientFactory;
    llmRouter = startup.llmRouter;    
    const insightService = new InsightGenerationService(startup.mongoClient, startup.llmRouter);
    await insightService.generateInsights(startup.env.CODEBASE_DIR_PATH);
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

main().catch(console.error);
