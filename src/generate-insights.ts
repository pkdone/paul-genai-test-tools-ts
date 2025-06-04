import databaseConfig from "./config/database.config";
import SummariesGenerator from "./insightGenerator/summaries-generator";
import { getProjectNameFromPath } from "./utils/path-utils";
import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import LLMRouter from "./llm/llm-router";

/**
 * Main function to run the program.
 */
async function main() {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;

  try {
    const { env, mongoClient, llmRouter: router, mongoDBClientFactory: factory } = await bootstrapStartup();   
    mongoDBClientFactory = factory;
    llmRouter = router;
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Generating insights for project: ${projectName}`);
    llmRouter.displayLLMStatusSummary();
    const summariesGenerator = new SummariesGenerator(mongoClient, llmRouter, 
      databaseConfig.CODEBASE_DB_NAME, databaseConfig.SOURCES_COLLCTN_NAME, databaseConfig.SUMMARIES_COLLCTN_NAME,
      projectName);
    await summariesGenerator.generateSummariesDataInDB()
    console.log("Finished enerating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    llmRouter.displayLLMStatusDetails();
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

main().catch(console.error);
