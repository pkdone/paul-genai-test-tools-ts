import { injectable, inject } from "tsyringe";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { logErrorMsgAndDetail } from "../../../utils/error-utils";
import { httpConfig, mcpConfig } from "../../../config";
import McpDataServer from "./mcp-data-server";
import { TOKENS } from "../../../di/tokens";

/** 
 * Class to handle HTTP requests and responses for the Model Context Protocol (MCP) server.
 */
@injectable()
export default class McpHttpServer {
  private readonly mcpServer: McpServer;
  
  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.McpDataServer) private readonly mcpDataServer: McpDataServer) {
    this.mcpServer = this.mcpDataServer.configure();
  }

  /**
   * Configures the HTTP server to handle incoming requests.
   */
  configure() {
    const asyncHandler = this.getHttpAsyncHandler();  
    return createServer((req: IncomingMessage, res: ServerResponse) => {
      asyncHandler(req, res).catch((error: unknown) => {
        this.sendHTTPError(res, httpConfig.HTTP_INTERNAL_SERVER_ERROR_CODE, "Internal Server Error", "Error handling request:", error);      
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
        const url = new URL(req.url ?? "", `http://${req.headers.host ?? mcpConfig.DEFAULT_MCP_HOSTNAME}`);
        const { pathname, searchParams } = url;
        const method = req.method;
  
        if (method === httpConfig.METHOD_GET && pathname === mcpConfig.URL_PATH_SSE) {
          if (res.writableEnded) return;
          const transport = new SSEServerTransport(mcpConfig.URL_PATH_MESSAGES, res);
          transports.set(transport.sessionId, transport);
          res.on("close", () => transports.delete(transport.sessionId));
          try {
            await this.mcpServer.connect(transport);
          } catch (err: unknown) {
            this.sendHTTPError(res, httpConfig.HTTP_INTERNAL_SERVER_ERROR_CODE, "SSE Connection Error", `SSE connect error for ${transport.sessionId}:`, err);
          }
        } else if (method === httpConfig.METHOD_POST && pathname === mcpConfig.URL_PATH_MESSAGES) {
          if (res.writableEnded) return;
          const body = await this.buildHTTPBody(req);
          let parsedData: unknown;
  
          try {
            parsedData = JSON.parse(body);
            const sessionId = searchParams.get("sessionId");
            const transport = sessionId && transports.get(sessionId);
  
            if (!transport) {
              this.sendHTTPError(res, httpConfig.HTTP_BAD_REQUEST_CODE, "No session", `No active session found for ID: ${sessionId ?? "unknown"}`);
            } else {
              await transport.handlePostMessage(req, res, parsedData);
            }
          } catch (parseError: unknown) {
            this.sendHTTPError(res, httpConfig.HTTP_BAD_REQUEST_CODE, "Bad Request: Invalid JSON", "Error parsing JSON:", parseError);
          }
        } else if (!res.writableEnded) {
          this.sendHTTPError(res, httpConfig.HTTP_NOT_FOUND_CODE, "Not Found", "Non writableEnded response for unknown path");
        }
      } catch (error: unknown) {
        if (!res.writableEnded) this.sendHTTPError(res, httpConfig.HTTP_INTERNAL_SERVER_ERROR_CODE, "Internal Server Error", "Unhandled error in HTTP request handler:", error);
      }
    };
  }
  
  /**
   * Sends an HTTP error response.
   */
  private sendHTTPError(res: ServerResponse, code: number, externalMsg: string, errMsg: string, error: unknown = null) {
    logErrorMsgAndDetail(errMsg, error);
  
    if (!res.headersSent) {
      res.writeHead(code).end(externalMsg);
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
      req.setEncoding(httpConfig.ENCODING_UTF8);
      req.on(mcpConfig.EVENT_DATA, (chunk: string) => { data += chunk; });
      req.on(mcpConfig.EVENT_END, () => { resolve(data); });
      req.on(mcpConfig.EVENT_ERROR, (err) => { reject(err); });
    });
  }  
   
}
 

