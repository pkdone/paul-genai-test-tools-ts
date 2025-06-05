import { runService } from "./lifecycle/service-runner";
import { MongoDBConnectionTestService } from "./services/mongodb-connection-test.service";
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
      if (!dependencies.mongoClient) throw new Error("Required MongoDB client dependency not provided");
      return new MongoDBConnectionTestService(dependencies.mongoClient, dependencies.env);
    },
    // Service configuration
    { requiresMongoDB: true, requiresLLM: false }
  );
}

// Bootstrap
main().catch(console.error);
