import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import LLMRouter from "./llm/llm-router";
import { CodebaseCaptureService } from "./services/codebase-capture.service";

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
    const captureService = new CodebaseCaptureService(startup.mongoClient, startup.llmRouter);
    await captureService.captureCodebase(startup.env.CODEBASE_DIR_PATH, startup.env.IGNORE_ALREADY_PROCESSED_FILES);
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

main().catch(console.error);
