import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import AnalysisDataServer from "../insightsServer/insights-data-server";

// Constants for the MCP server
const MCP_SERVER_NAME = "MCPAnalyzeDataServer";
const MCP_SERVER_VERSION = "0.0.1";
const BUSPROCS_RSC_NAME = "businessprocesses";
const BUSPROCS_RSC_TEMPLATE = "businessprocesses://list";

/** 
 * Class representing the MCP Data Server.
 */
class McpDataServer {
  /**
   * Constructor.
   */
  constructor(private readonly analysisDataServer: AnalysisDataServer) {}

  /**
   * Configures the MCP server with the given AnalysisDataServer.
   */
  configure() {
    const mcpServer = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
    mcpServer.resource(
      BUSPROCS_RSC_NAME,
      BUSPROCS_RSC_TEMPLATE,
      async (uri) => ({
        contents: [{
          uri: uri.href,
          text: JSON.stringify(await this.analysisDataServer.getBusinessProcesses(), null, 2),
        }]
      })
    );
    return mcpServer;
  }  
}
 
export default McpDataServer;