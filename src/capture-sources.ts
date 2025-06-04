import databaseConfig from "./config/database.config";
import DBInitializer from "./codebaseDBLoader/db-initializer";
import { getProjectNameFromPath } from "./utils/path-utils";
import CodebaseToDBLoader from "./codebaseDBLoader/codebase-loader";
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
    const ignoreIfAlreadyCaptured = env.IGNORE_ALREADY_PROCESSED_FILES;
    console.log(`Processing source files for project: ${projectName}`);
    const dbInitializer = new DBInitializer(mongoClient, databaseConfig.CODEBASE_DB_NAME, 
                                            databaseConfig.SOURCES_COLLCTN_NAME,
                                            databaseConfig.SUMMARIES_COLLCTN_NAME,
                                            llmRouter.getEmbeddedModelDimensions());
    await dbInitializer.ensureRequiredIndexes();
    llmRouter.displayLLMStatusSummary();
    const codebaseToDBLoader = new CodebaseToDBLoader(mongoClient, llmRouter, projectName, srcDirPath, ignoreIfAlreadyCaptured);
    await codebaseToDBLoader.loadIntoDB();  
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
    llmRouter.displayLLMStatusDetails();
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

main().catch(console.error);
