import appConst from "./env/app-consts";
import { readFile } from "./utils/fs-utils";
import LLMRouter from "./llm/llm-router";
import { loadEnvVars } from "./env/env-vars";
import { LLMModelQuality } from "./types/llm-types";

/**
 * Main function to run the program.
 */
async function main() {
  const env = loadEnvVars();
  console.log(`START: ${new Date().toISOString()}`);
  const llmRouter = new LLMRouter(env.LLM);  
  // TODO: log LLMs being used, not just overall provider - have a look as how did this in old generated report
  const prompt = await readFile(appConst.SAMPLE_PROMPT_FILEPATH);
  console.log("\n---PROMPT---");
  console.log(prompt);
  console.log("\n\n---EMBEDDINGS---");
  const embeddingsResult = await llmRouter.generateEmbeddings("hard-coded-test-input", prompt);
  console.log(embeddingsResult);
  console.log("\n\n---COMPLETION (Primary LLM)---");
  const completionPrimaryResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, false, {}, LLMModelQuality.PRIMARY);
  console.log(completionPrimaryResult);
  console.log("\n\n---COMPLETION (Secondary LLM)---");
  const completionSecondaryResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, false, {}, LLMModelQuality.SECONDARY);
  console.log(completionSecondaryResult);
  console.log(" ");
  await llmRouter.close();
  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite background tasks running
}

// Bootstrap
main().catch(console.error);
