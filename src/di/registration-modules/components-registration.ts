import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { FileSummarizer } from "../../features/ingestion/codebase/file-summarizer";
import { HtmlReportFormatter } from "../../features/reporting/reportGeneration/html-report-formatter";
import { RawCodeToInsightsFileGenerator } from "../../features/reporting/insightsFileGeneration/raw-code-to-insights-file-generator";
import AppReportGenerator from "../../features/reporting/reportGeneration/app-report-generator";
import CodebaseToDBLoader from "../../features/ingestion/codebase/codebase-to-db-loader";
import CodeQuestioner from "../../features/querying/code-questioner";
import DBCodeInsightsBackIntoDBGenerator from "../../features/ingestion/insights/db-code-insights-back-into-db-generator";
import { LLMStructuredResponseInvoker } from "../../llm/core/llm-structured-response-invoker";
import InsightsDataServer from "../../features/api/mcpServing/insights-data-server";
import McpDataServer from "../../features/api/mcpServing/mcp-data-server";
import McpHttpServer from "../../features/api/mcpServing/mcp-http-server";
import type LLMRouter from "../../llm/core/llm-router";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";

/**
 * Register internal helper components.
 * Components that depend on LLMRouter use async factories, others use singletons.
 */
export function registerComponents(): void {  
  // Register components that don't depend on LLMRouter as regular singletons
  container.registerSingleton(TOKENS.HtmlReportFormatter, HtmlReportFormatter);
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(TOKENS.RawCodeToInsightsFileGenerator, RawCodeToInsightsFileGenerator);
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);
  
  // Register components that depend on LLMRouter with async factories
  registerLLMDependentComponents();
  
  console.log('Internal helper components registered as singletons');
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
      const fileSummarizer = await c.resolve<Promise<FileSummarizer>>(TOKENS.FileSummarizer);
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
