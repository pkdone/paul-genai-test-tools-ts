import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import InsightsDataServer from "./insights-data-server";
import { mcpConfig } from "../../config";

/** 
 * Class representing the MCP Data Server.
 */
export default class McpDataServer {
  /**
   * Constructor.
   */
  constructor(private readonly analysisDataServer: InsightsDataServer) {}

  /**
   * Configures the MCP server with the given AnalysisDataServer.
   */
  configure() {
    const mcpServer = new McpServer({ name: mcpConfig.MCP_SERVER_NAME, version: mcpConfig.MCP_SERVER_VERSION });
    mcpServer.resource(
      mcpConfig.BUSPROCS_RSC_NAME,
      mcpConfig.BUSPROCS_RSC_TEMPLATE,
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
 
