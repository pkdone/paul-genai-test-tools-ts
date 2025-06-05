import { bootstrapJustLLMStartup } from "./lifecycle/bootstrap-startup";
import LLMRouter from "./llm/llm-router";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import { InlineInsightsService } from "./services/inline-insights.service";

/**
 * Main function to run the program.
 */
async function main() {
  let llmRouter: LLMRouter | undefined;
  
  try {
    const startup = await bootstrapJustLLMStartup();   
    llmRouter = startup.llmRouter;    
    const insightsService = new InlineInsightsService(startup.llmRouter);
    await insightsService.generateInlineInsights(startup.env.CODEBASE_DIR_PATH, startup.env.LLM);
  } finally {
    await gracefulShutdown(llmRouter);
  }
}

main().catch(console.error);
