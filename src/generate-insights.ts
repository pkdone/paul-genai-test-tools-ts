import { runService } from "./lifecycle/service-runner";
import { InsightGenerationService } from "./services/insight-generation.service";
import { ServiceDependencies } from "./types/service.types";

/**
 * Main function to run the program.
 * 
 * Note, this wrapper script is used to wrap around the main business logic service to allow easy
 * user point and click selection and debugging of the service in an IDE like VS Code, rather than 
 * needing to explicitly invoke a generic script with parameters to indicate which underlying
 * service to use. So we need to avoid having one single higher order CLI script.
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
