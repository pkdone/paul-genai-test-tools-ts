import { bootstrapJustLLMStartup } from "./lifecycle/bootstrap-startup";
import LLMRouter from "./llm/llm-router";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import { LLMTestService } from "./services/llm-test.service";

/**
 * Main function to run the program.
  * 
 * Note, this wrapper script is used to wrap around the main busines logic service to allow easy
 * user point andd click selection and debugging of the service in an IDB like VS Code, rather than 
 * needing to explicitly invoke a generic script with parameters to indicate which underlying
 * service to use. So we need to avoid having one single higher order CLI script.
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
