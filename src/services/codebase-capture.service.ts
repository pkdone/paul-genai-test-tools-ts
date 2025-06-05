import { MongoClient } from 'mongodb';
import databaseConfig from "../config/database.config";
import DBInitializer from "../codebaseDBLoader/db-initializer";
import { getProjectNameFromPath } from "../utils/path-utils";
import CodebaseToDBLoader from "../codebaseDBLoader/codebase-loader";
import LLMRouter from "../llm/llm-router";

/**
 * Service to capture the codebase.
 */
export class CodebaseCaptureService {
  /**
   * Constructor.
   */
  constructor(
    private readonly mongoClient: MongoClient,
    private readonly llmRouter: LLMRouter
  ) {}

  /**
   * Captures the codebase.
   */
  async captureCodebase(srcDirPath: string, ignoreIfAlreadyCaptured: boolean): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Processing source files for project: ${projectName}`);
    const dbInitializer = new DBInitializer(
      this.mongoClient, 
      databaseConfig.CODEBASE_DB_NAME, 
      databaseConfig.SOURCES_COLLCTN_NAME,
      databaseConfig.SUMMARIES_COLLCTN_NAME,
      this.llmRouter.getEmbeddedModelDimensions()
    );
    await dbInitializer.ensureRequiredIndexes();
    this.llmRouter.displayLLMStatusSummary();
    const codebaseToDBLoader = new CodebaseToDBLoader(
      this.mongoClient, 
      this.llmRouter, 
      projectName, 
      srcDirPath, 
      ignoreIfAlreadyCaptured
    );
    await codebaseToDBLoader.loadIntoDB();      
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 