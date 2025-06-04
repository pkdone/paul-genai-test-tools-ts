import fileSystemConfig from "./config/fileSystem.config";
import { clearDirectory, buildDirDescendingListOfFiles } from "./utils/fs-utils";
import { bootstrapJustLLMStartup } from "./lifecycle/bootstrap-startup";
import { CodebaseInsightProcessor } from "./insightGenerator/codebase-insight-processor";
import LLMRouter from "./llm/llm-router";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";

/**
 * Main function to run the program.
 */
async function main() {
  let llmRouter: LLMRouter | undefined;
  
  try {
    const { env, llmRouter: router } = await bootstrapJustLLMStartup();   
    llmRouter = router;
    const srcDirPath = env.CODEBASE_DIR_PATH.replace(/\/$/, "");
    const srcFilepaths = await buildDirDescendingListOfFiles(srcDirPath);
    llmRouter.displayLLMStatusSummary();
    const insightProcessor = new CodebaseInsightProcessor();
    const prompts = await insightProcessor.loadPrompts();
    await clearDirectory(fileSystemConfig.OUTPUT_DIR);  
    await insightProcessor.processSourceFilesWithPrompts(llmRouter, srcFilepaths, srcDirPath, prompts, env.LLM);  
    llmRouter.displayLLMStatusDetails();
    console.log(`View generated results in the '${fileSystemConfig.OUTPUT_DIR}' folder`);
  } finally {
    await gracefulShutdown(llmRouter);
  }
}

main().catch(console.error);
