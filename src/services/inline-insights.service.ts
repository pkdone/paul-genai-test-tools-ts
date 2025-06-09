import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { fileSystemConfig } from "../config";
import { clearDirectory, buildDirDescendingListOfFiles } from "../utils/fs-utils";
import { CodebaseInsightProcessor } from "../insightGenerator/codebase-insight-processor";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to generate inline insights.
 */
@injectable()
export class InlineInsightsService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
  ) {}

  /**
   * Execute the service - generates inline insights.
   */
  async execute(): Promise<void> {
    await this.generateInlineInsights(this.env.CODEBASE_DIR_PATH, this.env.LLM);
  }

  /**
   * Generates inline insights.
   */
  private async generateInlineInsights(srcDirPath: string, llmName: string): Promise<void> {
    const cleanSrcDirPath = srcDirPath.replace(fileSystemConfig.TRAILING_SLASH_PATTERN, "");
    const srcFilepaths = await buildDirDescendingListOfFiles(cleanSrcDirPath);
    this.llmRouter.displayLLMStatusSummary();
    const insightProcessor = new CodebaseInsightProcessor();
    const prompts = await insightProcessor.loadPrompts();
    await clearDirectory(fileSystemConfig.OUTPUT_DIR);  
    await insightProcessor.processSourceFilesWithPrompts(this.llmRouter, srcFilepaths, 
      cleanSrcDirPath, prompts, llmName);      
    this.llmRouter.displayLLMStatusDetails();
    console.log(`View generated results in the '${fileSystemConfig.OUTPUT_DIR}' folder`);
  }
} 