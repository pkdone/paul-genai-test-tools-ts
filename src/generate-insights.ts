import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import LLMRouter from "./llm/llm-router";
import { InsightGenerationService } from "./services/insight-generation.service";

/**
 * Main function to run the program.
 * 
 * Note, this wrapper script is used to wrap around the main busines logic service to allow easy
 * user point andd click selection and debugging of the service in an IDB like VS Code, rather than 
 * needing to explicitly invoke a generic script with parameters to indicate which underlying
 * service to use. So we need to avoid having one single higher order CLI script.
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
