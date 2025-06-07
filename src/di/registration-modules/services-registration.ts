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
 * Register application services.
 * This function should only be called once per application lifetime to maintain singleton behavior.
 */
export function registerServices(): void {
  console.log('Registering application services (singleton initialization)...');  
  container.register(TOKENS.CodebaseCaptureService, { useClass: CodebaseCaptureService });
  container.register(TOKENS.CodeQueryService, { useClass: CodeQueryService });
  container.register(TOKENS.InsightGenerationService, { useClass: InsightGenerationService });
  container.register(TOKENS.InlineInsightsService, { useClass: InlineInsightsService });
  container.register(TOKENS.MongoDBConnectionTestService, { useClass: MongoDBConnectionTestService });
  container.register(TOKENS.LLMTestService, { useClass: LLMTestService });
  container.register(TOKENS.InsightsMcpServerService, { useClass: InsightsMcpServerService });
  console.log('Application services registered as singletons');
} 