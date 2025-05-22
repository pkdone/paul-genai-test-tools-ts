import mongoDBService from "./utils/mongodb-service";
import databaseConfig from "./config/database.config";
import SummariesGenerator from "./insightGenerator/summaries-generator";
import { getProjectNameFromPath } from "./utils/path-utils";
import { bootstrap } from "./env/bootstrap";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);

  try {
    const { env, mongoClient, llmRouter } = await bootstrap();   
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
    await mongoDBService.closeAll();
  }

  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some abandoned LLM requests may still be hanging  
}

main().catch(console.error);
