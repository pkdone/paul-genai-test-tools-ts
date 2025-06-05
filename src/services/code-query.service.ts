import { MongoClient } from 'mongodb';
import { getTextLines } from "../utils/fs-utils";
import { getProjectNameFromPath } from "../utils/path-utils";
import CodeQuestioner from "../talkToCodebase/code-questioner";
import promptsConfig from "../config/prompts.config";
import LLMRouter from "../llm/llm-router";

/**
 * Service to query the codebase.
 */
export class CodeQueryService {
  /**
   * Constructor.
   */
  constructor(
    private readonly mongoClient: MongoClient,
    private readonly llmRouter: LLMRouter
  ) {}

  /**
   * Queries the codebase.
   */
  async queryCodebase(srcDirPath: string): Promise<void> {
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