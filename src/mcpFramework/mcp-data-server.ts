import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import AnalysisDataServer from "../dataServer/analysis-data-server";
import { z } from "zod";

// Constants for the MCP server
const MCP_SERVER_NAME = "MCPAnalyzeDataServer";
const MCP_SERVER_VERSION = "0.0.1";
const BUSPROCS_RSC_NAME = "businessprocesses";
const BUSPROCS_RSC_TEMPLATE = "businessprocesses://list";
const ECHO_RSC_NAME = "echo";
const ECHO_RSC_TEMPLATE = "echo://{message}";

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
          text: await this.analysisDataServer.getBusinessProcesses(),
        }]
      })
    );
    mcpServer.resource(
      ECHO_RSC_NAME,
      new ResourceTemplate(ECHO_RSC_TEMPLATE, { list: undefined }),
      (uri, { message }) => ({
        contents: [{
          uri: uri.href,
          text: `Resource echo: ${this.getMsgFromStringOrArray(message)}`
        }]
      })
    );
    mcpServer.tool(
      ECHO_RSC_NAME,
      { message: z.string() },
      ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }]
      })
    );
    mcpServer.prompt(
      ECHO_RSC_NAME,
      { message: z.string() },
      ({ message }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please process this message: ${message}`
          }
        }]
      })
    );
    return mcpServer;
  }
  
  /**
   * Utility function to convert a string or an array of strings into a single string.
   */
  private getMsgFromStringOrArray(message: string | string[]) {
    return Array.isArray(message) ? message.join(", ") : message;
  }  
}
 
export default McpDataServer;