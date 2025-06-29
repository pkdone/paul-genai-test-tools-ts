import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { CodebaseCaptureService } from "../../features/ingestion/codebase/codebase-capture.service";
import { CodebaseQueryService } from "../../features/querying/code-query.service";
import { InsightsFromDBGenerationService } from "../../features/ingestion/insights/insights-from-db-generation.service";
import { OneShotGenerateInsightsService } from "../../features/oneShot/one-shot-generate-insights.service";
import { MDBConnectionTestService } from "../../testUtils/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../testUtils/test-pluggable-llms.service";
import { McpServerService } from "../../features/api/mcp-server.service";
import { ReportGenerationService } from "../../features/reporting/report-generation-service";
import { DBInitializerService } from "../../repositories/db-initializer.service";
import type LLMRouter from "../../llm/core/llm-router";
import type { EnvVars } from "../../app/env.types";
import type CodebaseToDBLoader from "../../features/ingestion/codebase/codebase-to-db-loader";
import type DBCodeInsightsBackIntoDBGenerator from "../../features/ingestion/insights/db-code-insights-back-into-db-generator";
import type { RawCodeToInsightsFileGenerator } from "../../features/reporting/insightsFileGeneration/raw-code-to-insights-file-generator";

/**
 * Register main executable services as singletons using tsyringe's built-in singleton management.
 * These services represent the primary entry points for application functionality.
 */
export function registerServices(): void {
  // Register services that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  container.registerSingleton(TOKENS.DBInitializerService, DBInitializerService);
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  
  // Register services that depend on LLMRouter with async factories
  registerLLMDependentServices();
  
  console.log('Main executable services registered as singletons');
}

/**
 * Register services that depend on LLMRouter using async factories to handle the async LLMRouter dependency.
 * Using manual dependency resolution for async dependencies to ensure proper initialization.
 */
function registerLLMDependentServices(): void {
  // CodebaseCaptureService
  container.register(TOKENS.CodebaseCaptureService, {
    useFactory: async (c) => {
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      const dbInitializerService = c.resolve<DBInitializerService>(TOKENS.DBInitializerService);
      const envVars = c.resolve<EnvVars>(TOKENS.EnvVars);
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const codebaseToDBLoader = await c.resolve<Promise<CodebaseToDBLoader>>(TOKENS.CodebaseToDBLoader);
      return new CodebaseCaptureService(llmRouter, dbInitializerService, envVars, projectName, codebaseToDBLoader);
    },
  });

  // CodebaseQueryService
  container.register(TOKENS.CodebaseQueryService, {
    // eslint-disable-next-line @typescript-eslint/require-await
    useFactory: async (c) => {
      return c.resolve(CodebaseQueryService);
    },
  });

  // McpServerService - doesn't depend on LLMRouter, so can be synchronous
  container.register(TOKENS.McpServerService, {
    useFactory: (c) => {
      return c.resolve(McpServerService);
    },
  });

  // InsightsFromDBGenerationService
  container.register(TOKENS.InsightsFromDBGenerationService, {
    useFactory: async (c) => {
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const dbCodeInsightsGenerator = await c.resolve<Promise<DBCodeInsightsBackIntoDBGenerator>>(TOKENS.DBCodeInsightsBackIntoDBGenerator);
      return new InsightsFromDBGenerationService(llmRouter, projectName, dbCodeInsightsGenerator);
    },
  });

  // OneShotGenerateInsightsService
  container.register(TOKENS.OneShotGenerateInsightsService, {
    useFactory: async (c) => {
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      const envVars = c.resolve<EnvVars>(TOKENS.EnvVars);
      const insightProcessor = c.resolve<RawCodeToInsightsFileGenerator>(TOKENS.RawCodeToInsightsFileGenerator);
      return new OneShotGenerateInsightsService(llmRouter, envVars, insightProcessor);
    },
  });

  // PluggableLLMsTestService
  container.register(TOKENS.PluggableLLMsTestService, {
    useFactory: async (c) => {
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      return new PluggableLLMsTestService(llmRouter);
    },
  });

  console.log('LLM-dependent services registered with async factories');
} 