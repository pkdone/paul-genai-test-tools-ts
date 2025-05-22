/**
 * Database configuration
 */
export const databaseConfig = {
  DEFAULT_MONGO_SVC: "default",
  CODEBASE_DB_NAME: "codebase-analyzed",
  SOURCES_COLLCTN_NAME: "sources",
  SUMMARIES_COLLCTN_NAME: "appsummaries",
} as const;

export default databaseConfig; 