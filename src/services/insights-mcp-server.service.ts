import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { MongoClient } from 'mongodb';
import { databaseConfig, mcpConfig } from "../config";
import McpHttpServer from "../dataReporting/mcpServing/mcp-http-server";
import McpDataServer from "../dataReporting/mcpServing/mcp-data-server";
import InsightsDataServer from "../dataReporting/mcpServing/insights-data-server";
import { getProjectNameFromPath } from "../utils/path-utils";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import { TOKENS } from "../di/tokens";
import type { MongoDBClientFactory } from "../mdb/mdb-client-factory";
import { gracefulShutdown } from "../lifecycle/env";

/**
 * Service to run the MCP insights server.
 */
@injectable()
export class InsightsMcpServerService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient,
    @inject(TOKENS.MongoDBClientFactory) private readonly mongoDBClientFactory: MongoDBClientFactory,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
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
    const srcDirPath = this.env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    const analysisDataServer = new InsightsDataServer(this.mongoClient, databaseConfig.CODEBASE_DB_NAME, projectName);
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