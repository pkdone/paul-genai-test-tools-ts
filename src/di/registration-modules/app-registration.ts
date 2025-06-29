import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { createAsyncFactory, asyncDep, syncDep } from "../async-factory-helper";

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

// Type imports - these are no longer needed since we use the helper factory

/**
 * Register all application-level dependencies (repositories, components, and services).
 * This consolidated registration function handles the core business logic dependencies.
 */
export function registerAppDependencies(): void {
  registerRepositories();
  registerComponents();
  registerServices();

  console.log("All application dependencies registered");
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

  console.log("Repositories registered");
}

/**
 * Register internal helper components.
 * Components that depend on LLMRouter use async factories, others use singletons.
 */
function registerComponents(): void {
  // Register components that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.HtmlReportFormatter, HtmlReportFormatter);
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(
    TOKENS.RawCodeToInsightsFileGenerator,
    RawCodeToInsightsFileGenerator,
  );
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);

  // Register components that depend on LLMRouter with async factories
  registerLLMDependentComponents();

  console.log("Internal helper components registered");
}

/**
 * Register components that depend on LLMRouter using async factories to handle the async LLMRouter dependency.
 * Using manual dependency resolution for async dependencies to ensure proper initialization.
 */
function registerLLMDependentComponents(): void {
  // LLMStructuredResponseInvoker
  container.register(TOKENS.LLMStructuredResponseInvoker, {
    useFactory: createAsyncFactory(LLMStructuredResponseInvoker, [
      asyncDep(TOKENS.LLMRouter)
    ])
  });

  // FileSummarizer
  container.register(TOKENS.FileSummarizer, {
    useFactory: createAsyncFactory(FileSummarizer, [
      asyncDep(TOKENS.LLMStructuredResponseInvoker)
    ])
  });

  // CodebaseToDBLoader
  container.register(TOKENS.CodebaseToDBLoader, {
    useFactory: createAsyncFactory(CodebaseToDBLoader, [
      syncDep(TOKENS.SourcesRepository),
      asyncDep(TOKENS.LLMRouter),
      asyncDep(TOKENS.FileSummarizer)
    ])
  });

  // CodeQuestioner
  container.register(TOKENS.CodeQuestioner, {
    useFactory: createAsyncFactory(CodeQuestioner, [
      syncDep(TOKENS.SourcesRepository),
      asyncDep(TOKENS.LLMRouter)
    ])
  });

  // DBCodeInsightsBackIntoDBGenerator
  container.register(TOKENS.DBCodeInsightsBackIntoDBGenerator, {
    useFactory: createAsyncFactory(DBCodeInsightsBackIntoDBGenerator, [
      syncDep(TOKENS.AppSummariesRepository),
      asyncDep(TOKENS.LLMRouter),
      syncDep(TOKENS.SourcesRepository),
      syncDep(TOKENS.ProjectName),
      asyncDep(TOKENS.LLMStructuredResponseInvoker)
    ])
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
  container.registerSingleton(TOKENS.CodebaseQueryService, CodebaseQueryService);
  container.registerSingleton(TOKENS.McpServerService, McpServerService);

  // Register services that depend on LLMRouter with async factories
  registerLLMDependentServices();

  console.log("Main executable services registered");
}

/**
 * Register services that depend on LLMRouter using async factories to handle the async LLMRouter dependency.
 * Using manual dependency resolution for async dependencies to ensure proper initialization.
 */
function registerLLMDependentServices(): void {
  // CodebaseCaptureService
  container.register(TOKENS.CodebaseCaptureService, {
    useFactory: createAsyncFactory(CodebaseCaptureService, [
      asyncDep(TOKENS.LLMRouter),
      syncDep(TOKENS.DBInitializerService),
      syncDep(TOKENS.EnvVars),
      syncDep(TOKENS.ProjectName),
      asyncDep(TOKENS.CodebaseToDBLoader)
    ])
  });

  // InsightsFromDBGenerationService
  container.register(TOKENS.InsightsFromDBGenerationService, {
    useFactory: createAsyncFactory(InsightsFromDBGenerationService, [
      asyncDep(TOKENS.LLMRouter),
      syncDep(TOKENS.ProjectName),
      asyncDep(TOKENS.DBCodeInsightsBackIntoDBGenerator)
    ])
  });

  // OneShotGenerateInsightsService
  container.register(TOKENS.OneShotGenerateInsightsService, {
    useFactory: createAsyncFactory(OneShotGenerateInsightsService, [
      asyncDep(TOKENS.LLMRouter),
      syncDep(TOKENS.EnvVars),
      syncDep(TOKENS.RawCodeToInsightsFileGenerator)
    ])
  });

  // PluggableLLMsTestService
  container.register(TOKENS.PluggableLLMsTestService, {
    useFactory: createAsyncFactory(PluggableLLMsTestService, [
      asyncDep(TOKENS.LLMRouter)
    ])
  });

  console.log("LLM-dependent services registered with async factories");
}
