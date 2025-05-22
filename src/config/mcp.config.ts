/**
 * MCP server configuration
 */
export const mcpConfig = {
  MCP_SERVER_NAME: "MCPAnalyzeDataServer",
  MCP_SERVER_VERSION: "0.0.1",
  BUSPROCS_RSC_NAME: "businessprocesses",
  BUSPROCS_RSC_TEMPLATE: "businessprocesses://list",
  URL_PATH_SSE: "/sse",
  URL_PATH_MESSAGES: "/messages",
  EVENT_DATA: "data",
  EVENT_END: "end",
  EVENT_ERROR: "error",
} as const;

export default mcpConfig;
