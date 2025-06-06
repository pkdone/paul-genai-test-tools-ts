import { MongoClient } from 'mongodb';
import databaseConfig from "../config/database.config";
import SummariesGenerator from "../insightGenerator/summaries-generator";
import { getProjectNameFromPath } from "../utils/path-utils";
import LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import { EnvVars } from "../types/env.types";

/**
 * Service to generate insights.
 */
export class InsightGenerationService implements Service {
  /**
   * Constructor.
   */
  constructor(private readonly mongoClient: MongoClient, private readonly llmRouter: LLMRouter,
              private readonly env: EnvVars) {}

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
    const summariesGenerator = new SummariesGenerator(this.mongoClient, this.llmRouter, 
                               databaseConfig.CODEBASE_DB_NAME, databaseConfig.SOURCES_COLLCTN_NAME, 
                               databaseConfig.SUMMARIES_COLLCTN_NAME, projectName);
    await summariesGenerator.generateSummariesDataInDB();    
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 