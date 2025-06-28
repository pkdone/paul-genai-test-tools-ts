import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { FileSummarizer } from "../../codebaseIngestion/file-summarizer";
import { HtmlReportFormatter } from "../../reporting/reportGeneration/html-report-formatter";
import AppReportGenerator from "../../reporting/reportGeneration/app-report-generator";
import CodebaseToDBLoader from "../../codebaseIngestion/codebase-to-db-loader";
import CodeQuestioner from "../../codebaseQuerying/code-questioner";
import DBCodeInsightsBackIntoDBGenerator from "../../insightsGeneration/db-code-insights-back-into-db-generator";
import { LLMStructuredResponseInvoker } from "../../llm/llm-structured-response-invoker";
import InsightsDataServer from "../../api/mcpServing/insights-data-server";
import McpDataServer from "../../api/mcpServing/mcp-data-server";
import McpHttpServer from "../../api/mcpServing/mcp-http-server";

/**
 * Register internal helper components as singletons.
 * These components are used by services but aren't main executable services themselves.
 */
export function registerComponents(): void {  
  container.registerSingleton(TOKENS.FileSummarizer, FileSummarizer);
  container.registerSingleton(TOKENS.HtmlReportFormatter, HtmlReportFormatter);
  container.registerSingleton(TOKENS.AppReportGenerator, AppReportGenerator);
  container.registerSingleton(TOKENS.CodebaseToDBLoader, CodebaseToDBLoader);
  container.registerSingleton(TOKENS.CodeQuestioner, CodeQuestioner);
  container.registerSingleton(TOKENS.DBCodeInsightsBackIntoDBGenerator, DBCodeInsightsBackIntoDBGenerator);
  container.registerSingleton(TOKENS.LLMStructuredResponseInvoker, LLMStructuredResponseInvoker);
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);  
  console.log('Internal helper components registered as singletons');
}
