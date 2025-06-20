import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { CodebaseCaptureService } from "../../services/codebase-capture.service";
import { CodebaseQueryService } from "../../services/code-query.service";
import { InsightsFromDBGenerationService } from "../../services/insights-from-db-generation.service";
import { OneShotGenerateInsightsService } from "../../services/one-shot-generate-insights.service";
import { MDBConnectionTestService } from "../../services/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../services/test-pluggable-llms.service";
import { McpServerService } from "../../services/mcp-server.service";
import { ReportGenerationService } from "../../services/report-generation-service";
import { PromptBuilder } from "../../promptTemplating/prompt-builder";
import { FileSummarizer } from "../../codebaseIngestion/file-summarizer";
import { HtmlReportFormatter } from "../../dataReporting/reportGeneration/html-report-formatter";

/**
 * Register application services as singletons using tsyringe's built-in singleton management.
 */
export function registerServices(): void {
  console.log('Registering application services as singletons...');  
  container.registerSingleton(TOKENS.CodebaseCaptureService, CodebaseCaptureService);
  container.registerSingleton(TOKENS.CodebaseQueryService, CodebaseQueryService);
  container.registerSingleton(TOKENS.InsightsFromDBGenerationService, InsightsFromDBGenerationService);
  container.registerSingleton(TOKENS.OneShotGenerateInsightsService, OneShotGenerateInsightsService);
  container.registerSingleton(TOKENS.PluggableLLMsTestService, PluggableLLMsTestService);
  container.registerSingleton(TOKENS.McpServerService, McpServerService);
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  
  // Register utility/helper classes
  container.registerSingleton(TOKENS.PromptBuilder, PromptBuilder);
  container.registerSingleton(TOKENS.FileSummarizer, FileSummarizer);
  container.registerSingleton(TOKENS.HtmlReportFormatter, HtmlReportFormatter);
  // Note: LLMStats and PromptAdapter are registered in llm-registration.ts
  
  console.log('Application services and utilities registered as singletons');
}

/**
 * Register MongoDB-dependent services. Should only be called when MongoDB is required.
 */
export function registerMongoDBServices(): void {
  console.log('Registering MongoDB-dependent services as singletons...');
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  console.log('MongoDB-dependent services registered as singletons');
} 