import McpHttpServer from "./mcpFramework/mcp-http-server"
import databaseConfig from "./config/database.config";
import serverConfig from "./config/server.config";
import InsightsDataServer from "./insightsServer/insights-data-server";
import McpDataServer from "./mcpFramework/mcp-data-server";
import { getProjectNameFromPath } from "./utils/path-utils";
import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";

/**
 * Main function to run the program.
 */
async function main() {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  
  try {
    const { env, mongoClient, mongoDBClientFactory: factory } = await bootstrapStartup();   
    mongoDBClientFactory = factory;
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
      void gracefulShutdown(undefined, mongoDBClientFactory);
    });    
  } catch (error) {
    console.error("Failed to start server:", error);
    await gracefulShutdown(undefined, mongoDBClientFactory);
    process.exit(1);
  }
}

main().catch(console.error);
