import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { CodebaseCaptureService } from "../../services/codebase-capture.service";
import { CodeQueryService } from "../../services/code-query.service";
import { InsightGenerationService } from "../../services/insight-generation.service";
import { InlineInsightsService } from "../../services/inline-insights.service";
import { MDBConnectionTestService } from "../../services/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../services/test-pluggable-llms.service";
import { InsightsMcpServerService } from "../../services/insights-mcp-server.service";
import { ReportGenerationService } from "../../services/report-generation-service";

/**
 * Register application services as singletons using tsyringe's built-in singleton management.
 */
export function registerServices(): void {
  console.log('Registering application services as singletons...');  
  container.registerSingleton(TOKENS.CodebaseCaptureService, CodebaseCaptureService);
  container.registerSingleton(TOKENS.CodeQueryService, CodeQueryService);
  container.registerSingleton(TOKENS.InsightGenerationService, InsightGenerationService);
  container.registerSingleton(TOKENS.InlineInsightsService, InlineInsightsService);
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  container.registerSingleton(TOKENS.PluggableLLMsTestService, PluggableLLMsTestService);
  container.registerSingleton(TOKENS.InsightsMcpServerService, InsightsMcpServerService);
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  console.log('Application services registered as singletons');
} 