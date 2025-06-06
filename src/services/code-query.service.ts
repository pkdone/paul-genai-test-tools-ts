import { MongoClient } from 'mongodb';
import { getTextLines } from "../utils/fs-utils";
import { getProjectNameFromPath } from "../utils/path-utils";
import CodeQuestioner from "../talkToCodebase/code-questioner";
import promptsConfig from "../config/prompts.config";
import LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import { EnvVars } from "../types/env.types";

/**
 * Service to query the codebase.
 */
export class CodeQueryService implements Service {
  /**
   * Constructor.
   */
  constructor(private readonly mongoClient: MongoClient, private readonly llmRouter: LLMRouter,
              private readonly env: EnvVars) {}

  /**
   * Execute the service - queries the codebase.
   */
  async execute(): Promise<void> {
    await this.queryCodebase(this.env.CODEBASE_DIR_PATH);
  }

  /**
   * Queries the codebase.
   */
  private async queryCodebase(srcDirPath: string): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Performing vector search then invoking LLM for optimal results for project: ${projectName}`);
    const codeQuestioner = new CodeQuestioner(this.mongoClient, this.llmRouter, projectName);
    const questions = await getTextLines(promptsConfig.QUESTIONS_PROMPTS_FILEPATH);

    for (const question of questions) {
      const result = await codeQuestioner.queryCodebaseWithQuestion(question);
      console.log(`\n---------------\nQUESTION: ${question}\n\n${result}\n---------------\n`);          
    }
  }
} 