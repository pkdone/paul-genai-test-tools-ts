/**
 * Dependency Injection tokens for the application.
 * These tokens are used to identify and inject dependencies throughout the application.
 */
export const TOKENS = {
  // Core dependencies
  MongoClient: Symbol.for('MongoClient'),
  MongoDBClientFactory: Symbol.for('MongoDBClientFactory'),
  LLMRouter: Symbol.for('LLMRouter'),
  LLMService: Symbol.for('LLMService'),
  EnvVars: Symbol.for('EnvVars'),
  
  // Configuration
  ServiceRunnerConfig: Symbol.for('ServiceRunnerConfig'),
  
  // Services
  CodebaseCaptureService: Symbol.for('CodebaseCaptureService'),
  CodebaseQueryService: Symbol.for('CodebaseQueryService'),
  InsightsFromDBGenerationService: Symbol.for('InsightsFromDBGenerationService'),
  RawCodeGenerateInsightsToFileService: Symbol.for('RawCodeGenerateInsightsToFileService'),
  PluggableLLMsTestService: Symbol.for('PluggableLLMsTestService'),
  MDBConnectionTestService: Symbol.for('MDBConnectionTestService'),
  McpServerService: Symbol.for('McpServerService'),
  ReportGenerationService: Symbol.for('ReportGenerationService'),
} as const; 