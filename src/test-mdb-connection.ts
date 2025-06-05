import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import { MongoDBConnectionTestService } from "./services/mongodb-connection-test.service";

/**
 * Main function to run the program.
 */
async function main() {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  
  try {
    const startup = await bootstrapStartup();   
    mongoDBClientFactory = startup.mongoDBClientFactory;    
    const testService = new MongoDBConnectionTestService(startup.mongoClient);
    await testService.testConnection(startup.env.CODEBASE_DIR_PATH);
  } finally {
    await gracefulShutdown(undefined, mongoDBClientFactory);
  }
}

// Bootstrap
main().catch(console.error);
