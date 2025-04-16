import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import McpHttpServer from "./mcp-framework/mcp-http-server"

/**
 * Main function to run the program.
 */
function main() {
  console.log(`START: ${new Date().toISOString()}`);
  const mcpServer = configureMCPServer();
  const mcpHttpServer = new McpHttpServer(mcpServer, "localhost");
  const httpServer = mcpHttpServer.configureHTTPServer();
  httpServer.listen(3001, () => { console.log("MCP server listening on port 3001"); });
  httpServer.on("close", () => { console.log(`END: ${new Date().toISOString()}`); });    
}

/**
 * Configures the Model Context Protocol (MCP) server with tools and resources.
 */
function configureMCPServer() {
  const mcpServer = new McpServer({ name: "example-server", version: "1.0.0" });
  mcpServer.tool("add",
    { a: z.number(), b: z.number() },
    ({ a, b }: { a: number; b: number; }) => ({
      content: [{ type: "text", text: String(a + b) }]
    })
  );
  mcpServer.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    (uri, { name }) => ({
      contents: [{
        uri: uri.href,
        text: `Hello, ${Array.isArray(name) ? name.join(", ") : name}!`
      }]
    })
  );
  return mcpServer;
}

// Bootstrap
main();

