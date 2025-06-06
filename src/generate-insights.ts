import { runService } from "./lifecycle/service-runner";
import { InsightGenerationService } from "./services/insight-generation.service";
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
      if (!dependencies.mongoClient || !dependencies.llmRouter) throw new Error("Required dependencies not provided");
      return new InsightGenerationService(dependencies.mongoClient, dependencies.llmRouter, dependencies.env);
    },
    // Service configuration
    { requiresMongoDB: true, requiresLLM: true }
  );
}

main().catch(console.error);
