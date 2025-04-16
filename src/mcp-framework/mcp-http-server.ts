import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/** 
 * Class to handle HTTP requests and responses for the Model Context Protocol (MCP) server.
 */
class McpHttpServer {
  /**
   * Constructor.
   */
  constructor(private readonly mcpServer: McpServer, private readonly hostname: string) {}

  /**
   * Configures the HTTP server to handle incoming requests.
   */
  configureHTTPServer() {
    const asyncHandler = this.getHttpAsyncHandler();  
    return createServer((req: IncomingMessage, res: ServerResponse) => {
      asyncHandler(req, res).catch((error: unknown) => {
        this.sendHTTPError(res, 500, "Internal Server Error", "Error handling request:", error);      
      });
    });
  }
  
  /**
   * Handles incoming HTTP requests asynchronously.
   */
  private getHttpAsyncHandler() {
    const transports = new Map<string, SSEServerTransport>();
  
    return async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? "", `http://${req.headers.host ?? this.hostname}`);
        const { pathname, searchParams } = url;
        const method = req.method;
  
        if (method === "GET" && pathname === "/sse") {
          if (res.writableEnded) return;
          const transport = new SSEServerTransport("/messages", res);
          transports.set(transport.sessionId, transport);
          res.on("close", () => transports.delete(transport.sessionId));
          try {
            await this.mcpServer.connect(transport);
          } catch (err: unknown) {
            this.sendHTTPError(res, 500, "SSE Connection Error", `SSE connect error for ${transport.sessionId}:`, err);
          }
        } else if (method === "POST" && pathname === "/messages") {
          if (res.writableEnded) return;
          const body = await this.buildHTTPBody(req);
          let parsedData: unknown;
  
          try {
            parsedData = JSON.parse(body);
            const sessionId = searchParams.get("sessionId");
            const transport = sessionId && transports.get(sessionId);
  
            if (!transport) {
              this.sendHTTPError(res, 400, "No session", `No active session found for ID: ${sessionId ?? "unknown"}`);
            } else {
              await transport.handlePostMessage(req, res, parsedData);
            }
          } catch (parseError) {
            this.sendHTTPError(res, 400, "Bad Request: Invalid JSON", "Error parsing JSON:", parseError);
          }
        } else if (!res.writableEnded) {
          this.sendHTTPError(res, 404, "Not Found", "Non writableEnded response for unknown path");
        }
      } catch (error) {
        if (!res.writableEnded) this.sendHTTPError(res, 500, "Internal Server Error", "Unhandled error in HTTP request handler:", error);
      }
    };
  }
  
  /**
   * Sends an HTTP error response.
   */
  private sendHTTPError(res: ServerResponse, code: number, externamMsg: string, errMsg: string, error: unknown = null) {
    console.error(errMsg, error);
  
    if (!res.headersSent) {
      res.writeHead(code).end(externamMsg);
    } else {
      res.end();
    }
  };
  
  /**
   * Builds the HTTP body from the incoming request.
   */
  private async buildHTTPBody(req: IncomingMessage) {
    return await new Promise<string>((resolve, reject) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => { data += chunk; });
      req.on("end", () => { resolve(data); });
      req.on("error", (err) => { reject(err); });
    });
  }  
   
}
 
export default McpHttpServer;