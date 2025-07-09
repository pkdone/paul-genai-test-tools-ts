import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Repository imports
import SourcesRepositoryImpl from "../../repositories/source/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/app-summary/app-summaries.repository";
import { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";

// Component imports
import { FileSummarizer } from "../../components/capture/file-summarizer";
import { HtmlReportFormatter } from "../../components/reporting/html-report-formatter";
import { RawCodeToInsightsFileGenerator } from "../../components/insights/one-shot-insights-generator";
import CodeQuestioner from "../../components/querying/code-questioner";
import AppReportGenerator from "../../components/reporting/app-report-generator";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import DBCodeInsightsBackIntoDBGenerator from "../../components/insights/db-code-insights-back-into-db-generator";
import { LLMStructuredResponseInvoker } from "../../llm/utils/llm-structured-response-invoker";
import InsightsDataServer from "../../components/api/mcpServing/insights-data-server";
import McpDataServer from "../../components/api/mcpServing/mcp-data-server";
import McpHttpServer from "../../components/api/mcpServing/mcp-http-server";

// Service imports (flattened structure)
import { CodebaseCaptureService } from "../../services/codebase-capture.service";
import { CodebaseQueryService } from "../../services/code-query.service";
import { InsightsFromDBGenerationService } from "../../services/insights-from-db-generation.service";
import { OneShotGenerateInsightsService } from "../../services/one-shot-generate-insights.service";
import { MDBConnectionTestService } from "../../services/mdb-connection-test.service";
import { PluggableLLMsTestService } from "../../services/test-pluggable-llms.service";
import { McpServerService } from "../../services/mcp-server.service";
import { ReportGenerationService } from "../../services/report-generation-service";
import { DBInitializerService } from "../../lifecycle/db-initializer.service";

// Type imports
import type LLMRouter from "../../llm/core/llm-router";
import type { EnvVars } from "../../lifecycle/env.types";

/**
 * Register all application-level dependencies (repositories, components, and services).
 * This consolidated registration function handles the core business logic dependencies.
 */
export function registerAppDependencies(): void {
  registerRepositories();
  registerComponents();
  registerServices();
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
 * Register components that depend on LLMRouter using synchronous factories since LLMRouter is now registered as a singleton.
 * This eliminates the need for complex async dependency chains.
 */
function registerLLMDependentComponents(): void {
  // LLMStructuredResponseInvoker
  container.register(TOKENS.LLMStructuredResponseInvoker, {
    useFactory: (c) => {
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      return new LLMStructuredResponseInvoker(llmRouter);
    },
  });

  // FileSummarizer
  container.register(TOKENS.FileSummarizer, {
    useFactory: (c) => {
      const llmStructuredResponseInvoker = c.resolve<LLMStructuredResponseInvoker>(
        TOKENS.LLMStructuredResponseInvoker,
      );
      return new FileSummarizer(llmStructuredResponseInvoker);
    },
  });

  // CodebaseToDBLoader
  container.register(TOKENS.CodebaseToDBLoader, {
    useFactory: (c) => {
      const sourcesRepository = c.resolve<SourcesRepository>(TOKENS.SourcesRepository);
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      const fileSummarizer = c.resolve<FileSummarizer>(TOKENS.FileSummarizer);
      return new CodebaseToDBLoader(sourcesRepository, llmRouter, fileSummarizer);
    },
  });

  // CodeQuestioner
  container.register(TOKENS.CodeQuestioner, {
    useFactory: (c) => {
      const sourcesRepository = c.resolve<SourcesRepository>(TOKENS.SourcesRepository);
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      return new CodeQuestioner(sourcesRepository, llmRouter);
    },
  });

  // DBCodeInsightsBackIntoDBGenerator
  container.register(TOKENS.DBCodeInsightsBackIntoDBGenerator, {
    useFactory: (c) => {
      const appSummariesRepository = c.resolve<AppSummariesRepository>(
        TOKENS.AppSummariesRepository,
      );
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      const sourcesRepository = c.resolve<SourcesRepository>(TOKENS.SourcesRepository);
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const llmStructuredResponseInvoker = c.resolve<LLMStructuredResponseInvoker>(
        TOKENS.LLMStructuredResponseInvoker,
      );
      return new DBCodeInsightsBackIntoDBGenerator(
        appSummariesRepository,
        llmRouter,
        sourcesRepository,
        projectName,
        llmStructuredResponseInvoker,
      );
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
  container.registerSingleton(TOKENS.McpServerService, McpServerService);

  // Register services that depend on LLMRouter with async factories
  registerLLMDependentServices();

  console.log("Main executable services registered");
}

/**
 * Register services that depend on LLMRouter using synchronous factories since LLMRouter is now registered as a singleton.
 * This eliminates the need for complex async dependency chains.
 */
function registerLLMDependentServices(): void {
  // CodebaseQueryService
  container.register(TOKENS.CodebaseQueryService, {
    useFactory: (c) => {
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const codeQuestioner = c.resolve<CodeQuestioner>(TOKENS.CodeQuestioner);
      return new CodebaseQueryService(projectName, codeQuestioner);
    },
  });

  // CodebaseCaptureService
  container.register(TOKENS.CodebaseCaptureService, {
    useFactory: (c) => {
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      const dbInitializerService = c.resolve<DBInitializerService>(TOKENS.DBInitializerService);
      const envVars = c.resolve<EnvVars>(TOKENS.EnvVars);
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const codebaseToDBLoader = c.resolve<CodebaseToDBLoader>(TOKENS.CodebaseToDBLoader);
      return new CodebaseCaptureService(
        llmRouter,
        dbInitializerService,
        envVars,
        projectName,
        codebaseToDBLoader,
      );
    },
  });

  // InsightsFromDBGenerationService
  container.register(TOKENS.InsightsFromDBGenerationService, {
    useFactory: (c) => {
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      const projectName = c.resolve<string>(TOKENS.ProjectName);
      const dbCodeInsightsBackIntoDBGenerator = c.resolve<DBCodeInsightsBackIntoDBGenerator>(
        TOKENS.DBCodeInsightsBackIntoDBGenerator,
      );
      return new InsightsFromDBGenerationService(
        llmRouter,
        projectName,
        dbCodeInsightsBackIntoDBGenerator,
      );
    },
  });

  // OneShotGenerateInsightsService
  container.register(TOKENS.OneShotGenerateInsightsService, {
    useFactory: (c) => {
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      const envVars = c.resolve<EnvVars>(TOKENS.EnvVars);
      const rawCodeToInsightsFileGenerator = c.resolve<RawCodeToInsightsFileGenerator>(
        TOKENS.RawCodeToInsightsFileGenerator,
      );
      return new OneShotGenerateInsightsService(llmRouter, envVars, rawCodeToInsightsFileGenerator);
    },
  });

  // PluggableLLMsTestService
  container.register(TOKENS.PluggableLLMsTestService, {
    useFactory: (c) => {
      const llmRouter = c.resolve<LLMRouter>(TOKENS.LLMRouter);
      return new PluggableLLMsTestService(llmRouter);
    },
  });

  console.log("LLM-dependent services registered with synchronous factories");
}
