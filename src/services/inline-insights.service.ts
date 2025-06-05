import fileSystemConfig from "../config/fileSystem.config";
import { clearDirectory, buildDirDescendingListOfFiles } from "../utils/fs-utils";
import { CodebaseInsightProcessor } from "../insightGenerator/codebase-insight-processor";
import LLMRouter from "../llm/llm-router";

/**
 * Service to generate inline insights.
 */
export class InlineInsightsService {
  /**
   * Constructor.
   */
  constructor(
    private readonly llmRouter: LLMRouter
  ) {}

  /**
   * Generates inline insights.
   */
  async generateInlineInsights(srcDirPath: string, llmName: string): Promise<void> {
    const cleanSrcDirPath = srcDirPath.replace(fileSystemConfig.TRAILING_SLASH_PATTERN, "");
    const srcFilepaths = await buildDirDescendingListOfFiles(cleanSrcDirPath);
    this.llmRouter.displayLLMStatusSummary();
    const insightProcessor = new CodebaseInsightProcessor();
    const prompts = await insightProcessor.loadPrompts();
    await clearDirectory(fileSystemConfig.OUTPUT_DIR);  
    await insightProcessor.processSourceFilesWithPrompts(
      this.llmRouter, 
      srcFilepaths, 
      cleanSrcDirPath, 
      prompts, 
      llmName
    );      
    this.llmRouter.displayLLMStatusDetails();
    console.log(`View generated results in the '${fileSystemConfig.OUTPUT_DIR}' folder`);
  }
} 