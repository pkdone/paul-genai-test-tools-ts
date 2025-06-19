import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import DBCodeInsightsBackIntoDBGenerator from "../insightsGeneration/db-code-insights-back-into-db-generator";
import { getProjectNameFromPath } from "../utils/path-utils";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import type { IAppSummariesRepository } from "../repositories/interfaces/app-summaries.repository.interface";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import { TOKENS } from "../di/tokens";

/**
 * Service to generate insights.
 */
@injectable()
export class InsightsFromDBGenerationService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: IAppSummariesRepository,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
  ) {}

  /**
   * Execute the service - generates insights.
   */
  async execute(): Promise<void> {
    await this.generateInsights(this.env.CODEBASE_DIR_PATH);
  }

  /**
   * Generates insights.
   */
  private async generateInsights(srcDirPath: string): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Generating insights for project: ${projectName}`);
    this.llmRouter.displayLLMStatusSummary();
    const summariesGenerator = new DBCodeInsightsBackIntoDBGenerator(
      this.appSummariesRepository, 
      this.llmRouter, 
      this.sourcesRepository,
      projectName
    );
    await summariesGenerator.generateSummariesDataInDB();    
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 