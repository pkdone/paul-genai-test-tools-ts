import appConst from "./types/app-constants";
import envConst from "./types/env-constants";
import { getEnvVar } from "./utils/envvar-utils";
import { readFile } from "./utils/basics-utils";
import LLMRouter from "./llm/llm-router";
import { LLMModelSize } from "./types/llm-types";


/**
 * Main function to run the program.
 */
async function main(): Promise<void> {
  console.log(`START: ${new Date()}`);
  const llmRouter = new LLMRouter(getEnvVar(envConst.ENV_LLM), getEnvVar(envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
  const prompt = await readFile(appConst.SAMPLE_PROMPT_FILEPATH);
  console.log("\n---PROMPT---");
  console.log(prompt);
  console.log("\n\n---EMBEDDINGS---");
  //const embeddingsResult = await llmRouter.generateEmbeddings("hard-coded-test-input", prompt);
  //console.log(embeddingsResult);
  console.log("NOT IMPLEMENTED");
  console.log("\n\n---COMPLETION (small token limit)---");
  const completionSmallResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, LLMModelSize.SMALL, false);
  console.log(completionSmallResult);
  //console.log("NOT IMPLEMENTED");
  console.log("\n\n---COMPLETION (large token limit)---");
  const completionLargeResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, LLMModelSize.LARGE, false);
  console.log(completionLargeResult);
  console.log(" ");
  await llmRouter.close();
  console.log(`END: ${new Date()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running
}


// Bootstrap
(async () => {
  await main();
})();
