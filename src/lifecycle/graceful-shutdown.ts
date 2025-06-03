import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import LLMRouter from "../llm/llm-router";
import { logErrorMsgAndDetail } from "../utils/error-utils";

/**
 * Sets up graceful shutdown handlers for the application.
 * This replaces the global SIGINT handler that was previously in the MongoDB singleton.
 */
export function setupGracefulShutdown(
  mongoDBClientFactory?: MongoDBClientFactory,
  llmRouter?: LLMRouter
): void {
  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    try {
      // Close LLM router first
      if (llmRouter) {
        await llmRouter.close();
        console.log("LLM router closed.");
      }
      
      // Close MongoDB connections
      if (mongoDBClientFactory) {
        await mongoDBClientFactory.closeAll();
        console.log("MongoDB connections closed.");
      }
      
      console.log("Graceful shutdown completed. Exiting process.");
      process.exit(0);
    } catch (error: unknown) {
      logErrorMsgAndDetail("Error during graceful shutdown:", error);
      process.exit(1);
    }
  };

  // Handle various termination signals
  process.on("SIGINT", () => {
    void handleShutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void handleShutdown("SIGTERM");
  });
} 