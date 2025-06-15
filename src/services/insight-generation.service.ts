import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { MongoClient } from 'mongodb';
import { databaseConfig } from "../config";
import DBCodeInsightsBackIntoDBGenerator from "../dataCapture/insightsFromDBGeneration/insights-back-into-db-generator";
import { getProjectNameFromPath } from "../utils/path-utils";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
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
    @inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
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
    const summariesGenerator = new DBCodeInsightsBackIntoDBGenerator(this.mongoClient, this.llmRouter, 
                               databaseConfig.CODEBASE_DB_NAME, databaseConfig.SOURCES_COLLCTN_NAME, 
                               databaseConfig.SUMMARIES_COLLCTN_NAME, projectName);
    await summariesGenerator.generateSummariesDataInDB();    
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 