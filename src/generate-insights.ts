import envConst from "./types/env-constants";
import { getEnvVar } from "./utils/envvar-utils";
import mongoDBService from "./utils/mongodb-service";
import appConst from "./types/app-constants";
import SummariesGenerator from "./insightGenerator/summaries-generator";
import { getProjectNameFromPath } from "./utils/fs-utils";
import { ModelFamily } from "./types/llm-types";
import LLMRouter from "./llm/llm-router";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);

  try {
    // Load environment variables
    const srcDirPath = getEnvVar<string>(envConst.ENV_CODEBASE_DIR_PATH);
    const projectName = getProjectNameFromPath(srcDirPath);     
    const llmProvider = getEnvVar<ModelFamily>(envConst.ENV_LLM);
    const mdbURL = getEnvVar<string>(envConst.ENV_MONGODB_URL); 
    const mongoClient = await mongoDBService.connect("default", mdbURL);
    console.log(`Generating insights for project: ${projectName}`);

    // Load metadata about every file in the project into the database
    const llmRouter = new LLMRouter(llmProvider, getEnvVar<boolean>(
      envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
    console.log("LLM inovocation event types that will be recorded:");
    llmRouter.displayLLMStatusSummary();
    const summariesGenerator = new SummariesGenerator(mongoClient, llmRouter, 
      appConst.CODEBASE_DB_NAME, appConst.SOURCES_COLLCTN_NAME, appConst.SUMMARIES_COLLCTN_NAME,
      projectName);
    await summariesGenerator.generateSummariesDataIntoInDB();
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

// Bootstrap
main().catch(console.error);
