import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { CodebaseCaptureService } from "../../services/codebase-capture.service";
import { CodebaseQueryService } from "../../services/code-query.service";
import { InsightsFromDBGenerationService } from "../../services/insights-from-db-generation.service";
import { RawCodeGenerateInsightsToFileService } from "../../services/raw-code-generate-insights-to-file.service";
import { MDBConnectionTestService } from "../../services/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../services/test-pluggable-llms.service";
import { McpServerService } from "../../services/mcp-server.service";
import { ReportGenerationService } from "../../services/report-generation-service";

/**
 * Register application services as singletons using tsyringe's built-in singleton management.
 */
export function registerServices(): void {
  console.log('Registering application services as singletons...');  
  container.registerSingleton(TOKENS.CodebaseCaptureService, CodebaseCaptureService);
  container.registerSingleton(TOKENS.CodebaseQueryService, CodebaseQueryService);
  container.registerSingleton(TOKENS.InsightsFromDBGenerationService, InsightsFromDBGenerationService);
  container.registerSingleton(TOKENS.RawCodeGenerateInsightsToFileService, RawCodeGenerateInsightsToFileService);
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  container.registerSingleton(TOKENS.PluggableLLMsTestService, PluggableLLMsTestService);
  container.registerSingleton(TOKENS.McpServerService, McpServerService);
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  console.log('Application services registered as singletons');
} 