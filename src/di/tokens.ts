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
  LLMModelFamily: Symbol.for('LLMModelFamily'),
  EnvVars: Symbol.for('EnvVars'),
  ProjectName: Symbol.for('ProjectName'),
  
  // Configuration
  ServiceRunnerConfig: Symbol.for('ServiceRunnerConfig'),
  
  // Repositories
  SourcesRepository: Symbol.for('SourcesRepository'),
  AppSummariesRepository: Symbol.for('AppSummariesRepository'),
  
  // Services
  CodebaseCaptureService: Symbol.for('CodebaseCaptureService'),
  CodebaseQueryService: Symbol.for('CodebaseQueryService'),
  InsightsFromDBGenerationService: Symbol.for('InsightsFromDBGenerationService'),
  OneShotGenerateInsightsService: Symbol.for('OneShotGenerateInsightsService'),
  PluggableLLMsTestService: Symbol.for('PluggableLLMsTestService'),
  MDBConnectionTestService: Symbol.for('MDBConnectionTestService'),
  McpServerService: Symbol.for('McpServerService'),
  ReportGenerationService: Symbol.for('ReportGenerationService'),
  
  // Utility/Helper Classes
  PromptBuilder: Symbol.for('PromptBuilder'),
  FileSummarizer: Symbol.for('FileSummarizer'),
  LLMStats: Symbol.for('LLMStats'),
  PromptAdapter: Symbol.for('PromptAdapter'),
  HtmlReportFormatter: Symbol.for('HtmlReportFormatter'),
} as const; 