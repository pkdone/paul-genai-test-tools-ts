import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { logErrorMsgAndDetail } from "../utils/error-utils";

// Constants for HTTP status codes
const HTTP_INTERNAL_SERVER_ERROR_CODE = 500;
const HTTP_BAD_REQUEST_CODE = 400;
const HTTP_NOT_FOUND_CODE = 404;

// Constants for HTTP methods
const METHOD_GET = "GET";
const METHOD_POST = "POST";

// Constants for URL paths
const PATH_SSE = "/sse";
const PATH_MESSAGES = "/messages";

// Constants for HTTP request processing
const ENCODING_UTF8 = "utf8";
const EVENT_DATA = "data";
const EVENT_END = "end";
const EVENT_ERROR = "error";

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
  configure() {
    const asyncHandler = this.getHttpAsyncHandler();  
    return createServer((req: IncomingMessage, res: ServerResponse) => {
      asyncHandler(req, res).catch((error: unknown) => {
        this.sendHTTPError(res, HTTP_INTERNAL_SERVER_ERROR_CODE, "Internal Server Error", "Error handling request:", error);      
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
  
        if (method === METHOD_GET && pathname === PATH_SSE) {
          if (res.writableEnded) return;
          const transport = new SSEServerTransport(PATH_MESSAGES, res);
          transports.set(transport.sessionId, transport);
          res.on("close", () => transports.delete(transport.sessionId));
          try {
            await this.mcpServer.connect(transport);
          } catch (err: unknown) {
            this.sendHTTPError(res, HTTP_INTERNAL_SERVER_ERROR_CODE, "SSE Connection Error", `SSE connect error for ${transport.sessionId}:`, err);
          }
        } else if (method === METHOD_POST && pathname === PATH_MESSAGES) {
          if (res.writableEnded) return;
          const body = await this.buildHTTPBody(req);
          let parsedData: unknown;
  
          try {
            parsedData = JSON.parse(body);
            const sessionId = searchParams.get("sessionId");
            const transport = sessionId && transports.get(sessionId);
  
            if (!transport) {
              this.sendHTTPError(res, HTTP_BAD_REQUEST_CODE, "No session", `No active session found for ID: ${sessionId ?? "unknown"}`);
            } else {
              await transport.handlePostMessage(req, res, parsedData);
            }
          } catch (parseError) {
            this.sendHTTPError(res, HTTP_BAD_REQUEST_CODE, "Bad Request: Invalid JSON", "Error parsing JSON:", parseError);
          }
        } else if (!res.writableEnded) {
          this.sendHTTPError(res, HTTP_NOT_FOUND_CODE, "Not Found", "Non writableEnded response for unknown path");
        }
      } catch (error: unknown) {
        if (!res.writableEnded) this.sendHTTPError(res, HTTP_INTERNAL_SERVER_ERROR_CODE, "Internal Server Error", "Unhandled error in HTTP request handler:", error);
      }
    };
  }
  
  /**
   * Sends an HTTP error response.
   */
  private sendHTTPError(res: ServerResponse, code: number, externamMsg: string, errMsg: string, error: unknown = null) {
    logErrorMsgAndDetail(errMsg, error);
  
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
      req.setEncoding(ENCODING_UTF8);
      req.on(EVENT_DATA, (chunk: string) => { data += chunk; });
      req.on(EVENT_END, () => { resolve(data); });
      req.on(EVENT_ERROR, (err) => { reject(err); });
    });
  }  
   
}
 
export default McpHttpServer;
