import promptsConfig from "./config/prompts.config";
import { readFile } from "./utils/fs-utils";
import { LLMModelQuality } from "./types/llm.types";
import { bootstrapJustLLMStartup } from "./lifecycle/bootstrap-startup";
import LLMRouter from "./llm/llm-router";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";

/**
 * Main function to run the program.
 */
async function main() {
  let llmRouter: LLMRouter | undefined;
  
  try {
    const { llmRouter: router } = await bootstrapJustLLMStartup();   
    llmRouter = router;
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
  } finally {
    await gracefulShutdown(llmRouter);
  }
}

// Bootstrap
main().catch(console.error);
