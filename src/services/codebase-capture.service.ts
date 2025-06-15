import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { MongoClient } from 'mongodb';
import { databaseConfig } from "../config";
import DBInitializer from "../dataCapture/codebaseToDBIngestion/db-initializer";
import { getProjectNameFromPath } from "../utils/path-utils";
import CodebaseToDBLoader from "../dataCapture/codebaseToDBIngestion/codebase-to-db-loader";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to capture the codebase.
 */
@injectable()
export class CodebaseCaptureService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
  ) {}

  /**
   * Execute the service - captures the codebase.
   */
  async execute(): Promise<void> {
    await this.captureCodebase(this.env.CODEBASE_DIR_PATH, this.env.IGNORE_ALREADY_PROCESSED_FILES);
  }

  /**
   * Captures the codebase.
   */
  private async captureCodebase(srcDirPath: string, ignoreIfAlreadyCaptured: boolean): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Processing source files for project: ${projectName}`);
    const dbInitializer = new DBInitializer(this.mongoClient, databaseConfig.CODEBASE_DB_NAME, 
                                            databaseConfig.SOURCES_COLLCTN_NAME, 
                                            databaseConfig.SUMMARIES_COLLCTN_NAME,
                                            this.llmRouter.getEmbeddedModelDimensions()
    );
    await dbInitializer.ensureRequiredIndexes();
    this.llmRouter.displayLLMStatusSummary();
    const codebaseToDBLoader = new CodebaseToDBLoader(this.mongoClient, this.llmRouter, projectName, 
                                                      srcDirPath, ignoreIfAlreadyCaptured
    );
    await codebaseToDBLoader.loadIntoDB();      
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 