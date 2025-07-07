import { injectable, inject } from "tsyringe";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { logErrorMsgAndDetail } from "../../../common/utils/error-utils";
import { mcpConfig } from "./mcp.config";
import McpDataServer from "./mcp-data-server";
import { TOKENS } from "../../../di/tokens";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Class to handle HTTP requests and responses for the Model Context Protocol (MCP) server using Hono.
 */
@injectable()
export default class McpHttpServer {
  private readonly mcpServer: McpServer;
  private readonly transports = new Map<string, StreamableHTTPServerTransport>();

  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.McpDataServer) private readonly mcpDataServer: McpDataServer) {
    this.mcpServer = this.mcpDataServer.configure();
  }

  /**
   * Configures the Hono server to handle incoming MCP requests.
   */
  configure() {
    const app = new Hono();

    // Add CORS middleware
    app.use(
      `${mcpConfig.URL_PATH_MCP}/*`,
      cors({
        origin: "*", // Adjust for production
        allowHeaders: ["Content-Type", "Mcp-Session-Id"],
        exposeHeaders: ["Mcp-Session-Id"],
      }),
    );

    // Handle MCP requests - this will be replaced by the raw Node.js handler in the service
    app.all(mcpConfig.URL_PATH_MCP, (c) => {
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal Server Error: This endpoint should be handled by the raw Node.js handler" },
          id: null,
        },
        500,
      );
    });

    return app;
  }

  /**
   * Creates a raw Node.js HTTP handler for MCP requests.
   * This bypasses Hono's request/response handling to work directly with the MCP SDK.
   */
  createMcpHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      try {
        // Check for existing session ID
        const sessionId = req.headers["mcp-session-id"] as string;
        let transport: StreamableHTTPServerTransport;
        let body: unknown;

        if (sessionId && this.transports.has(sessionId)) {
          // Reuse existing transport
          const existingTransport = this.transports.get(sessionId);
          if (existingTransport) {
            transport = existingTransport;
            body = await this.parseRequestBody(req);
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32000, message: "Bad Request: Invalid session ID" },
              id: null,
            }));
            return;
          }
        } else {
          // Parse request body
          body = await this.parseRequestBody(req);
          
          if (req.method === "POST" && isInitializeRequest(body)) {
            // Create new transport for initialization request
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (newSessionId) => {
                this.transports.set(newSessionId, transport);
                console.log(`MCP session initialized with ID: ${newSessionId}`);
              },
            });

            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
              if (transport.sessionId) {
                this.transports.delete(transport.sessionId);
                console.log(`MCP session ${transport.sessionId} closed and removed.`);
              }
            };

            // Connect the transport to the MCP server
            await this.mcpServer.connect(transport);
          } else {
            // Invalid request - no session ID or not initialization request
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32000, message: "Bad Request: No valid session ID provided" },
              id: null,
            }));
            return;
          }
        }

        // Handle the request with the transport
        await transport.handleRequest(req, res, body);
      } catch (error: unknown) {
        logErrorMsgAndDetail("Error in MCP request handler", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal Server Error" },
            id: null,
          }));
        }
      }
    };
  }

  /**
   * Parses the request body from an IncomingMessage.
   */
  private async parseRequestBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (parseError) {
          reject(new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
        }
      });
      req.on("error", (error) => {
        reject(error);
      });
    });
  }
}
