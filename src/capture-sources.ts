import appConst from "./env/app-consts";
import DBInitializer from "./codebaseDBLoader/db-initializer";
import { getProjectNameFromPath } from "./utils/fs-utils";
import mongoDBService from "./utils/mongodb-service";
import CodebaseToDBLoader from "./codebaseDBLoader/codebase-loader";
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
    const ignoreIfAlreadyCaptured = env.IGNORE_ALREADY_PROCESSED_FILES;
    console.log(`Processing source files for project: ${projectName}`);

    // Ensure database indexes exist first
    const dbInitializer = new DBInitializer(mongoClient, appConst.CODEBASE_DB_NAME, 
                                            appConst.SOURCES_COLLCTN_NAME,
                                            appConst.SUMMARIES_COLLCTN_NAME,
                                            llmRouter.getEmbeddedModelDimensions());
    await dbInitializer.ensureRequiredIndexes();
  
    // Load metadata about every file in the project into the database
    console.log("LLM inovocation event types that will be recorded:");
    llmRouter.displayLLMStatusSummary();
    const codebaseToDBLoader = new CodebaseToDBLoader(mongoClient, llmRouter, projectName, srcDirPath, ignoreIfAlreadyCaptured);
    await codebaseToDBLoader.loadIntoDB();  
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
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
