/**
 * Centralized configuration entry point
 * 
 * This file serves as the single entry point for all application configurations.
 * It re-exports all individual configuration objects and provides an aggregated
 * AppConfig object for convenient access to all configurations.
 */

// Re-export all individual configurations
export { controlConfig } from './control.config';
export { databaseConfig } from './database.config';
export { fileSystemConfig } from './fileSystem.config';
export { httpConfig } from './http.config';
export { llmConfig } from './llm.config';
export { mcpConfig } from './mcp.config';
export { promptsConfig } from './prompts.config';
export { reportingConfig } from './reporting.config';

// Import all configurations for aggregation
import { controlConfig } from './control.config';
import { databaseConfig } from './database.config';
import { fileSystemConfig } from './fileSystem.config';
import { httpConfig } from './http.config';
import { llmConfig } from './llm.config';
import { mcpConfig } from './mcp.config';
import { promptsConfig } from './prompts.config';
import { reportingConfig } from './reporting.config';

/**
 * Aggregated application configuration object
 * 
 * This object provides centralized access to all configuration values
 * organized by functional area. This improves discoverability and
 * provides a single import for accessing any configuration value.
 */
export const appConfig = {
  control: controlConfig,
  database: databaseConfig,
  fileSystem: fileSystemConfig,
  http: httpConfig,
  llm: llmConfig,
  mcp: mcpConfig,
  prompts: promptsConfig,
  reporting: reportingConfig,
} as const;

/**
 * Type definition for the aggregated application configuration
 */
export type AppConfig = typeof appConfig; 