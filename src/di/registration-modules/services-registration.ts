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
import { DBInitializerService } from "../../services/db-initializer.service";

/**
 * Register main executable services as singletons using tsyringe's built-in singleton management.
 * These services represent the primary entry points for application functionality.
 */
export function registerServices(): void {
  container.registerSingleton(TOKENS.CodebaseCaptureService, CodebaseCaptureService);
  container.registerSingleton(TOKENS.CodebaseQueryService, CodebaseQueryService);
  container.registerSingleton(TOKENS.InsightsFromDBGenerationService, InsightsFromDBGenerationService);
  container.registerSingleton(TOKENS.OneShotGenerateInsightsService, OneShotGenerateInsightsService);
  container.registerSingleton(TOKENS.PluggableLLMsTestService, PluggableLLMsTestService);
  container.registerSingleton(TOKENS.McpServerService, McpServerService);
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  container.registerSingleton(TOKENS.DBInitializerService, DBInitializerService);  
  console.log('Main executable services registered as singletons');
}

/**
 * Register MongoDB-dependent services. Should only be called when MongoDB is required.
 */
export function registerMongoDBServices(): void {
  console.log('Registering MongoDB-dependent services as singletons...');
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  console.log('MongoDB-dependent services registered as singletons');
} 