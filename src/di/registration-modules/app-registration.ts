import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/source/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summary/app-summaries.repository";
import { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";

// Component imports
import { FileSummarizer } from "../../features/capture/file-summarizer";
import { HtmlReportFormatter } from "../../features/reporting/reportGeneration/html-report-formatter";
import { RawCodeToInsightsFileGenerator } from "../../features/oneShot/one-shot-insights-generator";
import AppReportGenerator from "../../features/reporting/reportGeneration/app-report-generator";
import CodebaseToDBLoader from "../../features/capture/codebase-to-db-loader";
import CodeQuestioner from "../../features/querying/code-questioner";
import DBCodeInsightsBackIntoDBGenerator from "../../features/insights/db-code-insights-back-into-db-generator";
import { LLMStructuredResponseInvoker } from "../../llm/utils/llm-structured-response-invoker";
import InsightsDataServer from "../../features/api/mcpServing/insights-data-server";
import McpDataServer from "../../features/api/mcpServing/mcp-data-server";
import McpHttpServer from "../../features/api/mcpServing/mcp-http-server";

// Service imports
import { CodebaseCaptureService } from "../../features/capture/codebase-capture.service";
import { CodebaseQueryService } from "../../features/querying/code-query.service";
import { InsightsFromDBGenerationService } from "../../features/insights/insights-from-db-generation.service";
import { OneShotGenerateInsightsService } from "../../features/oneShot/one-shot-generate-insights.service";
import { MDBConnectionTestService } from "../../features/diagnostics/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../features/diagnostics/test-pluggable-llms.service";
import { McpServerService } from "../../features/api/mcp-server.service";
import { ReportGenerationService } from "../../features/reporting/report-generation-service";
import { DBInitializerService } from "../../repositories/db-initializer.service";

// Type imports
import type LLMRouter from "../../llm/core/llm-router";
import type { EnvVars } from "../../lifecycle/env.types";
import type { FileSummarizer as FileSummarizerType } from "../../features/capture/file-summarizer";

/**
 * Register all application-level dependencies (repositories, components, and services).
 * This consolidated registration function handles the core business logic dependencies.
 */
export function registerAppDependencies(): void {
  registerRepositories();
  registerComponents();
  registerServices();
  
  console.log('All application dependencies registered');
}

/**
 * Registers repositories in the DI container
 */
function registerRepositories(): void {
  // Register repositories
  container.register<SourcesRepository>(TOKENS.SourcesRepository, {
    useClass: SourcesRepositoryImpl,
  });

  container.register<AppSummariesRepository>(TOKENS.AppSummariesRepository, {
    useClass: AppSummariesRepositoryImpl,
  });

  console.log('Repositories registered');
}

/**
 * Register internal helper components.
 * Components that depend on LLMRouter use async factories, others use singletons.
 */
function registerComponents(): void {  
  // Register components that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.HtmlReportFormatter, HtmlReportFormatter);
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(TOKENS.RawCodeToInsightsFileGenerator, RawCodeToInsightsFileGenerator);
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);
  
  // Register components that depend on LLMRouter with async factories
  registerLLMDependentComponents();
  
  console.log('Internal helper components registered');
}

/**
 * Register components that depend on LLMRouter using async factories to handle the async LLMRouter dependency.
 * Using manual dependency resolution for async dependencies to ensure proper initialization.
 */
function registerLLMDependentComponents(): void {
  // LLMStructuredResponseInvoker
  container.register(TOKENS.LLMStructuredResponseInvoker, {
    useFactory: async (c) => {
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      return new LLMStructuredResponseInvoker(llmRouter);
    },
  });

  // FileSummarizer
  container.register(TOKENS.FileSummarizer, {
    useFactory: async (c) => {
      const llmStructuredResponseInvoker = await c.resolve<Promise<LLMStructuredResponseInvoker>>(TOKENS.LLMStructuredResponseInvoker);
      return new FileSummarizer(llmStructuredResponseInvoker);
    },
  });

  // CodebaseToDBLoader
  container.register(TOKENS.CodebaseToDBLoader, {
    useFactory: async (c) => {
      const sourcesRepository = c.resolve<SourcesRepository>(TOKENS.SourcesRepository);
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      const fileSummarizer = await c.resolve<Promise<FileSummarizerType>>(TOKENS.FileSummarizer);
      return new CodebaseToDBLoader(sourcesRepository, llmRouter, fileSummarizer);
    },
  });

  // CodeQuestioner
  container.register(TOKENS.CodeQuestioner, {
    useFactory: async (c) => {
      const sourcesRepository = c.resolve<SourcesRepository>(TOKENS.SourcesRepository);
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      return new CodeQuestioner(sourcesRepository, llmRouter);
    },
  });

  // DBCodeInsightsBackIntoDBGenerator
  container.register(TOKENS.DBCodeInsightsBackIntoDBGenerator, {
    useFactory: async (c) => {
      const appSummariesRepository = c.resolve<AppSummariesRepository>(TOKENS.AppSummariesRepository);
      const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
      const sourcesRepository = c.resolve<SourcesRepository>(TOKENS.SourcesRepository);
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const llmStructuredResponseInvoker = await c.resolve<Promise<LLMStructuredResponseInvoker>>(TOKENS.LLMStructuredResponseInvoker);
      return new DBCodeInsightsBackIntoDBGenerator(appSummariesRepository, llmRouter, sourcesRepository, projectName, llmStructuredResponseInvoker);
    },
  });
}

/**
 * Register main executable services as singletons using tsyringe's built-in singleton management.
 * These services represent the primary entry points for application functionality.
 */
function registerServices(): void {
  // Register services that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.ReportGenerationService, ReportGenerationService);
  container.registerSingleton(TOKENS.DBInitializerService, DBInitializerService);
  container.registerSingleton(TOKENS.MDBConnectionTestService, MDBConnectionTestService);
  
  // Register services that depend on LLMRouter with async factories
  registerLLMDependentServices();
  
  console.log('Main executable services registered');
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