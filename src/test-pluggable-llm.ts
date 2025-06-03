import promptsConfig from "./config/prompts.config";
import { readFile } from "./utils/fs-utils";
import { LLMModelQuality } from "./types/llm.types";
import { bootstrapJustLLM } from "./lifecycle/bootstrap-startup";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);
  const { llmRouter } = await bootstrapJustLLM();
  console.log("LLM inovocation event types that will be recorded:");
  llmRouter.displayLLMStatusSummary();
  const prompt = await readFile(promptsConfig.SAMPLE_PROMPT_FILEPATH);
  console.log("\n---PROMPT---");
  console.log(prompt);
  console.log("\n\n---EMBEDDINGS---");
  const embeddingsResult = await llmRouter.generateEmbeddings("hard-coded-test-input", prompt);
  console.log(embeddingsResult ?? "<empty>");
  console.log("\n\n---COMPLETION (Primary LLM)---");
  const completionPrimaryResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, false, {}, LLMModelQuality.PRIMARY);
  console.log(completionPrimaryResult ?? "<empty>");
  console.log("\n\n---COMPLETION (Secondary LLM)---");
  const completionSecondaryResult = await llmRouter.executeCompletion("hard-coded-test-input", prompt, false, {}, LLMModelQuality.SECONDARY);
  console.log(completionSecondaryResult ?? "<empty>");
  console.log(" ");
  await llmRouter.close();
  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite background tasks running
}

// Bootstrap
main().catch(console.error);
