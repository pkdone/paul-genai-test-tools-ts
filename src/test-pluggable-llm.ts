import appConst from "./types/app-constants";
import envConst from "./types/env-constants";
import { LLMModelQuality } from "./types/llm-types";
import { getEnvVar } from "./utils/envvar-utils";
import { readFile } from "./utils/fs-utils";
import LLMRouter from "./llm/llm-router";

/**
 * Main function to run the program.
 */
async function main(): Promise<void> {
  console.log(`START: ${new Date()}`);
  const llmRouter = new LLMRouter(getEnvVar<string>(envConst.ENV_LLM), getEnvVar<boolean>(envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
  const prompt = await readFile(appConst.SAMPLE_PROMPT_FILEPATH);
  console.log("\n---PROMPT---");
  console.log(prompt);
  console.log("\n\n---EMBEDDINGS---");
  const embeddingsResult = await llmRouter.generateEmbeddings("hard-coded-test-input", prompt);
  console.log(embeddingsResult);
  console.log("\n\n---COMPLETION (Regular LLM)---");
  const completionRegularResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, LLMModelQuality.REGULAR, false);
  console.log(completionRegularResult);
  console.log("\n\n---COMPLETION (Premium LLM)---");
  const completionPremiumResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, LLMModelQuality.PREMIUM, false);
  console.log(completionPremiumResult);
  console.log(" ");
  await llmRouter.close();
  console.log(`END: ${new Date()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite background tasks running
}

// Bootstrap
(async () => {
  await main();
})();
