import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import { MongoDBConnectionTestService } from "./services/mongodb-connection-test.service";

/**
 * Main function to run the program.
 * 
 * Note, this wrapper script is used to wrap around the main busines logic service to allow easy
 * user point andd click selection and debugging of the service in an IDB like VS Code, rather than 
 * needing to explicitly invoke a generic  script with parameters to indicate which underlying
 * service to use.
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
