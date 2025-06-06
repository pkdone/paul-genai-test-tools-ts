import { runService } from "./lifecycle/service-runner";
import { InlineInsightsService } from "./services/inline-insights.service";
import { ServiceDependencies } from "./types/service.types";

/**
 * Main function to run the program.
 * 
 * Note, this wrapper script is used to wrap around the main business logic service to make it easy
 * programmers to be able to click this file and to then run and debug in an IDE (e.g., VS Code),
 * rather than needing to explicitly invoke a generic script with parameters to indicate which 
 * underlying service to run and debug. Therefore, we need to avoid having one single higher order
 * CLI script.
 */
async function main() {
  await runService(
    // Service factory function
    (dependencies: ServiceDependencies) => {
      if (!dependencies.llmRouter) throw new Error("Required LLM router dependency not provided");
      return new InlineInsightsService(dependencies.llmRouter, dependencies.env);
    },
    // Service configuration
    { requiresMongoDB: false, requiresLLM: true }
  );
}

main().catch(console.error);
