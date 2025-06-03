import databaseConfig from "./config/database.config";
import SummariesGenerator from "./insightGenerator/summaries-generator";
import { getProjectNameFromPath } from "./utils/path-utils";
import { bootstrap } from "./lifecycle/bootstrap-startup";
import { setupGracefulShutdown } from "./lifecycle/graceful-shutdown";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);

  let mongoDBClientFactory: MongoDBClientFactory | null = null;

  try {
    const { env, mongoClient, llmRouter, mongoDBClientFactory: factory } = await bootstrap();   
    mongoDBClientFactory = factory;
    setupGracefulShutdown(mongoDBClientFactory, llmRouter);
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Generating insights for project: ${projectName}`);
    console.log("LLM inovocation event types that will be recorded:");
    llmRouter.displayLLMStatusSummary();
    const summariesGenerator = new SummariesGenerator(mongoClient, llmRouter, 
      databaseConfig.CODEBASE_DB_NAME, databaseConfig.SOURCES_COLLCTN_NAME, databaseConfig.SUMMARIES_COLLCTN_NAME,
      projectName);
    await summariesGenerator.generateSummariesDataInDB()
    console.log("Finished enerating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    llmRouter.displayLLMStatusDetails();
    await llmRouter.close();
  } finally {
    if (mongoDBClientFactory) await mongoDBClientFactory.closeAll();
  }

  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some abandoned LLM requests may still be hanging  
}

main().catch(console.error);
