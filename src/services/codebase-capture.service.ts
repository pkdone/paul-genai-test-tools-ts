import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { getProjectNameFromPath } from "../utils/path-utils";
import CodebaseToDBLoader from "../dataCapture/codebaseToDBIngestion/codebase-to-db-loader";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import type { IAppSummariesRepository } from "../repositories/interfaces/app-summaries.repository.interface";
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
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: IAppSummariesRepository,
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
    
    // Ensure required indexes exist
    const numDimensions = this.llmRouter.getEmbeddedModelDimensions() ?? llmConfig.DEFAULT_VECTOR_DIMENSIONS_AMOUNT;
    await this.sourcesRepository.ensureIndexes(numDimensions);
    await this.appSummariesRepository.ensureIndexes();
    
    this.llmRouter.displayLLMStatusSummary();
    const codebaseToDBLoader = new CodebaseToDBLoader(this.sourcesRepository, this.llmRouter, projectName, 
                                                      srcDirPath, ignoreIfAlreadyCaptured
    );
    await codebaseToDBLoader.loadIntoDB();      
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 