import { MongoClient } from 'mongodb';
import databaseConfig from "../config/database.config";
import SummariesGenerator from "../insightGenerator/summaries-generator";
import { getProjectNameFromPath } from "../utils/path-utils";
import LLMRouter from "../llm/llm-router";

export class InsightGenerationService {
  constructor(
    private readonly mongoClient: MongoClient,
    private readonly llmRouter: LLMRouter
  ) {}

  async generateInsights(srcDirPath: string): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Generating insights for project: ${projectName}`);
    this.llmRouter.displayLLMStatusSummary();
    const summariesGenerator = new SummariesGenerator(
      this.mongoClient, 
      this.llmRouter, 
      databaseConfig.CODEBASE_DB_NAME, 
      databaseConfig.SOURCES_COLLCTN_NAME, 
      databaseConfig.SUMMARIES_COLLCTN_NAME,
      projectName
    );
    await summariesGenerator.generateSummariesDataInDB();    
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
} 