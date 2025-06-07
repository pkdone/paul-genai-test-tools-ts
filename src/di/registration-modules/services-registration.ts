import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { CodebaseCaptureService } from "../../services/codebase-capture.service";
import { CodeQueryService } from "../../services/code-query.service";
import { InsightGenerationService } from "../../services/insight-generation.service";
import { InlineInsightsService } from "../../services/inline-insights.service";
import { MongoDBConnectionTestService } from "../../services/mongodb-connection-test.service";
import { LLMTestService } from "../../services/llm-test.service";
import { InsightsMcpServerService } from "../../services/insights-mcp-server.service";

/**
 * Register application services as singletons using tsyringe's built-in singleton management.
 */
export function registerServices(): void {
  console.log('Registering application services as singletons...');  
  container.registerSingleton(TOKENS.CodebaseCaptureService, CodebaseCaptureService);
  container.registerSingleton(TOKENS.CodeQueryService, CodeQueryService);
  container.registerSingleton(TOKENS.InsightGenerationService, InsightGenerationService);
  container.registerSingleton(TOKENS.InlineInsightsService, InlineInsightsService);
  container.registerSingleton(TOKENS.MongoDBConnectionTestService, MongoDBConnectionTestService);
  container.registerSingleton(TOKENS.LLMTestService, LLMTestService);
  container.registerSingleton(TOKENS.InsightsMcpServerService, InsightsMcpServerService);  
  console.log('Application services registered as singletons');
} 