import appConst from "./env/app-consts";
import { clearDirectory, buildDirDescendingListOfFiles } from "./utils/fs-utils";
import { bootstrapJustLLM } from "./env/bootstrap";
import { CodebaseInsightProcessor } from "./insightGenerator/codebase-insight-processor";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);
  const { env, llmRouter } = bootstrapJustLLM();   
  const srcDirPath = env.CODEBASE_DIR_PATH.replace(/\/$/, "");
  const srcFilepaths = await buildDirDescendingListOfFiles(srcDirPath);
  llmRouter.displayLLMStatusSummary();
  const insightProcessor = new CodebaseInsightProcessor();
  const prompts = await insightProcessor.loadPrompts();
  await clearDirectory(appConst.OUTPUT_DIR);  
  await insightProcessor.processSourceFilesWithPrompts(llmRouter, srcFilepaths, srcDirPath, prompts, env.LLM);  
  llmRouter.displayLLMStatusDetails();
  await llmRouter.close();
  console.log(`View generated results in the '${appConst.OUTPUT_DIR}' folder`);
  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  
}

main().catch(console.error);
