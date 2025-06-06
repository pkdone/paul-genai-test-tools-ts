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
  
  // Services
  CodebaseCaptureService: Symbol.for('CodebaseCaptureService'),
  CodeQueryService: Symbol.for('CodeQueryService'),
  InsightGenerationService: Symbol.for('InsightGenerationService'),
  InlineInsightsService: Symbol.for('InlineInsightsService'),
  LLMTestService: Symbol.for('LLMTestService'),
  MongoDBConnectionTestService: Symbol.for('MongoDBConnectionTestService')
} as const; 