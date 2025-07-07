/**
 * MCP server configuration
 */
export const mcpConfig = {
  // MCP protocol configuration
  MCP_SERVER_NAME: "MCPAnalyzeDataServer",
  MCP_SERVER_VERSION: "0.0.1",
  BUSPROCS_RSC_NAME: "businessprocesses",
  BUSPROCS_RSC_TEMPLATE: "businessprocesses://list",
  URL_PATH_MCP: "/mcp",

  // MCP server configuration
  DEFAULT_MCP_HOSTNAME: "localhost",
  DEFAULT_MCP_PORT: 3001,
} as const;
