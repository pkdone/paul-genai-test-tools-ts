import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { mcpConfig } from "../config";
import McpHttpServer from "../dataReporting/mcpServing/mcp-http-server";
import McpDataServer from "../dataReporting/mcpServing/mcp-data-server";
import InsightsDataServer from "../dataReporting/mcpServing/insights-data-server";
import { Service } from "../types/service.types";
import type { AppSummariesRepository } from "../repositories/interfaces/app-summaries.repository.interface";
import { TOKENS } from "../di/tokens";
import type { MongoDBClientFactory } from "../mdb/mdb-client-factory";
import { gracefulShutdown } from "../lifecycle/env";

/**
 * Service to run the MCP insights server.
 */
@injectable()
export class McpServerService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.MongoDBClientFactory) private readonly mongoDBClientFactory: MongoDBClientFactory,
    @inject(TOKENS.ProjectName) private readonly projectName: string
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
    const analysisDataServer = new InsightsDataServer(this.appSummariesRepository, this.projectName);
    const mcpDataServer = new McpDataServer(analysisDataServer);
    const mcpServer = mcpDataServer.configure();
    const mcpHttpServer = new McpHttpServer(mcpServer, mcpConfig.DEFAULT_MCP_HOSTNAME);
    const httpServer = mcpHttpServer.configure();
    
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