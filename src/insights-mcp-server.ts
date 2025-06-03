import McpHttpServer from "./mcpFramework/mcp-http-server"
import databaseConfig from "./config/database.config";
import serverConfig from "./config/server.config";
import InsightsDataServer from "./insightsServer/insights-data-server";
import McpDataServer from "./mcpFramework/mcp-data-server";
import { getProjectNameFromPath } from "./utils/path-utils";
import { bootstrap } from "./lifecycle/bootstrap-startup";
import { setupGracefulShutdown } from "./lifecycle/graceful-shutdown";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);
  
  let mongoDBClientFactory: MongoDBClientFactory | null = null;
  
  try {
    const { env, mongoClient, mongoDBClientFactory: factory } = await bootstrap();   
    mongoDBClientFactory = factory;
    
    // Set up graceful shutdown at the application level
    setupGracefulShutdown(mongoDBClientFactory);
    
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    const analysisDataServer = new InsightsDataServer(mongoClient, databaseConfig.CODEBASE_DB_NAME, projectName);
    const mcpDataServer = new McpDataServer(analysisDataServer);
    const mcpServer = mcpDataServer.configure();
    const mcpHttpServer = new McpHttpServer(mcpServer, serverConfig.DEFAULT_MCP_HOSTNAME);
    const httpServer = mcpHttpServer.configure();
    
    httpServer.listen(serverConfig.DEFAULT_MCP_PORT, () => { 
      console.log(`MCP server listening on port ${serverConfig.DEFAULT_MCP_PORT}`); 
    });
    
    httpServer.on("close", () => {
      if (mongoDBClientFactory) {
        mongoDBClientFactory.closeAll().catch(console.error);
      }
      console.log(`END: ${new Date().toISOString()}`);
    });    
  } catch (error) {
    console.error("Failed to start server:", error);
    if (mongoDBClientFactory) await mongoDBClientFactory.closeAll();
    process.exit(1);
  }
}

main().catch(console.error);
