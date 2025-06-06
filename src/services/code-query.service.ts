import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { MongoClient } from 'mongodb';
import { getTextLines } from "../utils/fs-utils";
import { getProjectNameFromPath } from "../utils/path-utils";
import CodeQuestioner from "../talkToCodebase/code-questioner";
import promptsConfig from "../config/prompts.config";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to query the codebase.
 */
@injectable()
export class CodeQueryService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
  ) {}

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