import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { getTextLines } from "../utils/fs-utils";
import CodeQuestioner from "../codebaseQuerying/code-questioner";
import { promptsConfig } from "../config";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import { TOKENS } from "../di/tokens";

/**
 * Service to query the codebase.
 */
@injectable()
export class CodebaseQueryService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string
  ) {}

  /**
   * Execute the service - queries the codebase.
   */
  async execute(): Promise<void> {
    await this.queryCodebase();
  }

  /**
   * Queries the codebase.
   */
  private async queryCodebase(): Promise<void> {
    console.log(`Performing vector search then invoking LLM for optimal results for project: ${this.projectName}`);
    // Create CodeQuestioner with injected dependencies
    const codeQuestioner = new CodeQuestioner(
      this.sourcesRepository,
      this.llmRouter, 
      this.projectName
    );
    const questions = await getTextLines(promptsConfig.QUESTIONS_PROMPTS_FILEPATH);

    for (const question of questions) {
      const result = await codeQuestioner.queryCodebaseWithQuestion(question);
      console.log(`\n---------------\nQUESTION: ${question}\n\n${result}\n---------------\n`);          
    }
  }
} 