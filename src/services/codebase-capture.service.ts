import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../codebaseIngestion/codebase-to-db-loader";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import type { DBInitializerService } from "../dbInit/db-initializer.service";
import { llmConfig } from "../config";
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
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.DBInitializerService) private readonly dbInitializerService: DBInitializerService,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.CodebaseToDBLoader) private readonly codebaseToDBLoader: CodebaseToDBLoader
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
    console.log(`Processing source files for project: ${this.projectName}`);
    const numDimensions = this.llmRouter.getEmbeddedModelDimensions() ?? llmConfig.DEFAULT_VECTOR_DIMENSIONS_AMOUNT;
    await this.dbInitializerService.ensureCollectionsReady(numDimensions);    
    this.llmRouter.displayLLMStatusSummary();
    await this.codebaseToDBLoader.loadIntoDB(this.projectName, srcDirPath, ignoreIfAlreadyCaptured);      
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 