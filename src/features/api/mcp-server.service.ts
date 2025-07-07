import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { createServer } from "node:http";
import { mcpConfig } from "./mcpServing/mcp.config";
import McpHttpServer from "./mcpServing/mcp-http-server";
import { Service } from "../../lifecycle/service.types";
import { TOKENS } from "../../di/tokens";
import type { MongoDBClientFactory } from "../../common/mdb/mdb-client-factory";
import { gracefulShutdown } from "../../lifecycle/shutdown";

/**
 * Service to run the MCP insights server.
 */
@injectable()
export class McpServerService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.McpHttpServer) private readonly mcpHttpServer: McpHttpServer,
    @inject(TOKENS.MongoDBClientFactory)
    private readonly mongoDBClientFactory: MongoDBClientFactory,
  ) {}

  /**
   * Execute the service - starts the MCP insights server.
   */
  async execute(): Promise<void> {
    return this.startMcpServer();
  }

  /**
   * Starts the MCP insights server and returns a Promise that resolves when the server closes.
   */
  private async startMcpServer(): Promise<void> {
    const mcpHandler = this.mcpHttpServer.createMcpHandler();

    // Create a simple HTTP server that handles MCP requests directly
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
      
      // Handle MCP requests directly with the raw Node.js handler
      if (url.pathname === mcpConfig.URL_PATH_MCP) {
        // Add CORS headers for MCP requests
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        
        // Handle preflight requests
        if (req.method === "OPTIONS") {
          res.writeHead(200);
          res.end();
          return;
        }
        
        // Handle MCP requests asynchronously
        mcpHandler(req, res).catch((error: unknown) => {
          console.error("Error handling MCP request:", error);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal Server Error" },
              id: null,
            }));
          }
        });
      } else {
        // Handle other requests with a simple 404 response
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "Not Found",
          message: `Path ${url.pathname} not found. Available endpoints: ${mcpConfig.URL_PATH_MCP}`,
        }));
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(mcpConfig.DEFAULT_MCP_PORT, () => {
        console.log(`MCP server listening on http://localhost:${mcpConfig.DEFAULT_MCP_PORT}`);
      });

      server.on("close", () => {
        void this.handleGracefulShutdown().then(resolve);
      });
    });
  }

  /**
   * Handle graceful shutdown for the MCP server.
   */
  private async handleGracefulShutdown(): Promise<void> {
    await gracefulShutdown(undefined, this.mongoDBClientFactory);
  }
}
