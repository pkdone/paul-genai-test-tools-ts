import { bootstrapJustLLMStartup } from "./lifecycle/bootstrap-startup";
import LLMRouter from "./llm/llm-router";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import { LLMTestService } from "./services/llm-test.service";

/**
 * Main function to run the program.
 */
async function main() {
  let llmRouter: LLMRouter | undefined;
  
  try {
    const startup = await bootstrapJustLLMStartup();   
    llmRouter = startup.llmRouter;    
    const testService = new LLMTestService(startup.llmRouter);
    await testService.testLLMFunctionality();
  } finally {
    await gracefulShutdown(llmRouter);
  }
}

// Bootstrap
main().catch(console.error);
