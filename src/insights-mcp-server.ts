import McpHttpServer from "./mcpFramework/mcp-http-server"
import appConst from "./env/app-consts";
import InsightsDataServer from "./insightsServer/insights-data-server";
import mongoDBService from "./utils/mongodb-service";
import McpDataServer from "./mcpFramework/mcp-data-server";
import { getProjectNameFromPath } from "./utils/fs-utils";
import { bootstrap } from "./env/bootstrap";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);
  const { env, mongoClient } = await bootstrap();   
  const srcDirPath = env.CODEBASE_DIR_PATH;
  const projectName = getProjectNameFromPath(srcDirPath);     
  const analysisDataServer = new InsightsDataServer(mongoClient, appConst.CODEBASE_DB_NAME, projectName);
  const mcpDataServer = new McpDataServer(analysisDataServer);
  const mcpServer = mcpDataServer.configure();
  const mcpHttpServer = new McpHttpServer(mcpServer, appConst.DEFAULT_MCP_HOSTNAME);
  const httpServer = mcpHttpServer.configure();
  httpServer.listen(appConst.DEFAULT_MCP_PORT, () => { console.log("MCP server listening on port 3001"); });
  httpServer.on("close", () => {
    mongoDBService.closeAll().catch(console.error);
    console.log(`END: ${new Date().toISOString()}`);
  });    
}

// Bootstrap
main().catch(console.error);
