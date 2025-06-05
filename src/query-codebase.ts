import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import LLMRouter from "./llm/llm-router";
import { CodeQueryService } from "./services/code-query.service";

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
    const queryService = new CodeQueryService(startup.mongoClient, startup.llmRouter);
    await queryService.queryCodebase(startup.env.CODEBASE_DIR_PATH);
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

main().catch(console.error);
