import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { mcpConfig } from "./mcpServing/mcp.config";
import McpHttpServer from "./mcpServing/mcp-http-server";
import { Service } from "../../lifecycle/service.types";
import { TOKENS } from "../../di/tokens";
import type { MongoDBClientFactory } from "../../common/mdb/mdb-client-factory";
import { gracefulShutdown } from "../../lifecycle/env";

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
    @inject(TOKENS.MongoDBClientFactory) private readonly mongoDBClientFactory: MongoDBClientFactory
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
    const httpServer = this.mcpHttpServer.configure();
    
    // Return a Promise that keeps the server running until it's closed
    await new Promise<void>((resolve) => {
      httpServer.listen(mcpConfig.DEFAULT_MCP_PORT, () => { 
        console.log(`MCP server listening on port ${mcpConfig.DEFAULT_MCP_PORT}`); 
      });
      
      httpServer.on("close", () => {
        void this.handleGracefulShutdown();
        resolve(); // Resolve the Promise when server closes
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