import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { FileSummarizer } from "../../codebaseIngestion/file-summarizer";
import { HtmlReportFormatter } from "../../dataReporting/reportGeneration/html-report-formatter";
import AppReportGenerator from "../../dataReporting/reportGeneration/app-report-generator";
import CodebaseToDBLoader from "../../codebaseIngestion/codebase-to-db-loader";
import CodeQuestioner from "../../codebaseQuerying/code-questioner";
import DBCodeInsightsBackIntoDBGenerator from "../../insightsGeneration/db-code-insights-back-into-db-generator";

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
  console.log('Internal helper components registered as singletons');
}
