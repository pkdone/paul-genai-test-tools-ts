import appConst from "./types/app-constants";
import envConst from "./types/env-constants";
import DBInitializer from "./codebaseDBLoader/db-initializer";
import { getProjectNameFromPath } from "./utils/fs-utils";
import { getEnvVar } from "./utils/envvar-utils";
import mongoDBService from "./utils/mongodb-service";
import LLMRouter from "./llm/llm-router";
import CodebaseToDBLoader from "./codebaseDBLoader/codebase-loader";
import { ModelFamily } from "./types/llm-types";

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
    const ignoreIfAlreadyCaptured = getEnvVar(envConst.ENV_IGNORE_ALREADY_PROCESSED_FILES, false);

    // Ensure database indexes exist first
    const mongoClient = await mongoDBService.connect("default", mdbURL);
    const dbInitializer = new DBInitializer(mongoClient, appConst.SOURCES_COLLCTN_NAME, appConst.SUMMARIES_COLLCTN_NAME);
    await dbInitializer.ensureRequiredIndexes();
  
    // Load metadata about every file in the project into the database
    const llmRouter = new LLMRouter(llmProvider, getEnvVar<boolean>(envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
    llmRouter.displayLLMStatusSummary();
    const codebaseToDBLoader = new CodebaseToDBLoader(mongoClient, llmRouter, projectName, srcDirPath, ignoreIfAlreadyCaptured);
    await codebaseToDBLoader.loadIntoDB();  
    console.log("Finished capturing project files metadata into database");
    llmRouter.displayLLMStatusDetails();
    await llmRouter.close();
  } finally {
    await mongoDBService.closeAll();
  }

  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  
}

// Bootstrap
main().catch(console.error);
