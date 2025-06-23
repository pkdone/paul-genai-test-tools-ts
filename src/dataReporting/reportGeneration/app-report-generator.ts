import { injectable, inject } from "tsyringe";
import { fileSystemConfig, reportingConfig } from "../../config";
import type { SourcesRepository } from "../../repositories/interfaces/sources.repository.interface";
import type { AppSummariesRepository } from "../../repositories/interfaces/app-summaries.repository.interface";
import type { AppSummaryNameDescArray } from "../../repositories/models/app-summary.model";
import { TOKENS } from "../../di/tokens";
import { HtmlReportFormatter } from "./html-report-formatter";
import type { AppStatistics, ProcsAndTriggers } from "./types";
import { Complexity, isComplexity } from "./types";

/**
 * Class responsible for aggregating data for HTML report generation.
 * Data formatting is handled by HtmlReportFormatter.
 */
@injectable()
export default class AppReportGenerator {
  // Private fields
  private readonly currentDate;

  /**
   * Constructor
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.HtmlReportFormatter) private readonly htmlFormatter: HtmlReportFormatter
  ) { 
    this.currentDate = new Date().toLocaleString();
  }

  /**
   * Generate the HTML static file report using the HtmlReportFormatter.
   */
  async generateHTMLReport(projectName: string): Promise<string> {
    // Collect app statistics
    const appStats = await this.getAppStatistics(projectName);
    
    // Collect categorized data
    const categorizedData = await this.getCategorizedData(projectName);
    
    // Collect database integrations
    const dbInteractions = await this.buildDBInteractionList(projectName);
    
    // Collect stored procedures and triggers
    const procsAndTriggers = await this.buildDBStoredProcsTriggersSummaryList(projectName);
    
    // Use formatter to generate HTML
    return this.htmlFormatter.generateCompleteHTMLReport(
      appStats,
      categorizedData,
      dbInteractions,
      procsAndTriggers
    );
  }

  /**
   * Returns a list of database integrations.
   */
  async buildDBInteractionList(projectName: string) {
    return await this.sourcesRepository.getProjectDatabaseIntegrations(projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers.
   */
  async buildDBStoredProcsTriggersSummaryList(projectName: string) {
    const procsAndTriggers: ProcsAndTriggers = {
      procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
    };
    
    const records = await this.sourcesRepository.getProjectStoredProceduresAndTriggers(projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);

    for (const record of records) {
      const { summary } = record;
      
      if (!summary) {
        console.log(`No stored procs / triggers summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      // Process stored procedures
      for (const sp of summary.storedProcedures ?? []) {
        procsAndTriggers.procs.total++;
        
        // Call incrementComplexityCount unconditionally since it now handles null/undefined internally
        this.incrementComplexityCount(procsAndTriggers.procs, sp.complexity);
        
        procsAndTriggers.procs.list.push({
          path: record.filepath,
          type: "STORED PROCEDURE",
          functionName: sp.name,
          complexity: isComplexity(sp.complexity) ? sp.complexity : Complexity.LOW,
          linesOfCode: sp.linesOfCode,
          purpose: sp.purpose,
        });
      }

      // Process triggers
      for (const trig of summary.triggers ?? []) {
        procsAndTriggers.trigs.total++;
        
        // Call incrementComplexityCount unconditionally since it now handles null/undefined internally
        this.incrementComplexityCount(procsAndTriggers.trigs, trig.complexity);
        
        procsAndTriggers.trigs.list.push({
          path: record.filepath,
          type: "TRIGGER",
          functionName: trig.name,
          complexity: isComplexity(trig.complexity) ? trig.complexity : Complexity.LOW,
          linesOfCode: trig.linesOfCode,
          purpose: trig.purpose,
        });
      }
    }

    return procsAndTriggers;
  }

  /**
   * Collect app statistics data
   */
  private async getAppStatistics(projectName: string): Promise<AppStatistics> {
    const appSummaryRecord = await this.appSummariesRepository.getProjectAppSummaryDescAndLLMProvider(projectName);
    if (!appSummaryRecord) throw new Error("Unable to generate app statistics for a report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights");
    
    return {
      projectName: projectName,
      currentDate: this.currentDate,
      llmProvider: appSummaryRecord.llmProvider ?? "Unknown",
      fileCount: await this.sourcesRepository.getProjectFilesCount(projectName),
      linesOfCode: await this.sourcesRepository.getProjectTotalLinesOfCode(projectName),
      appDescription: appSummaryRecord.appDescription ?? "No description available"
    };
  }

  /**
   * Collect categorized data for all categories
   */
  private async getCategorizedData(projectName: string): Promise<{ category: string; label: string; data: AppSummaryNameDescArray }[]> {
    const categoryKeys = Object.keys(reportingConfig.APP_SUMMARIES_CATEGORY_TITLES).filter(key => key !== reportingConfig.APP_DESCRIPTION_KEY);
    const categorizedData = [];
    
    for (const category of categoryKeys) {
      const label = reportingConfig.APP_SUMMARIES_CATEGORY_TITLES[category as keyof typeof reportingConfig.APP_SUMMARIES_CATEGORY_TITLES];
      const data = await this.appSummariesRepository.getProjectAppSummaryField<AppSummaryNameDescArray>(projectName, category);
      // Handle null data by providing empty array
      categorizedData.push({ category, label, data: data ?? [] });
      console.log(`Generated ${label} table`);
    }
    
    return categorizedData;
  }

  /**
   * Increment the complexity count on a procs/trigs section.
   */
  private incrementComplexityCount(
    section: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    complexity: unknown // Accept unknown for robust checking
  ) {
    if (!isComplexity(complexity)) {
      console.warn(`Unexpected or missing complexity value encountered: ${String(complexity)}`);
      return;
    }
    
    // 'complexity' is now safely typed as Complexity
    switch (complexity) {
      case Complexity.LOW:
        section.low++;
        break;
      case Complexity.MEDIUM:
        section.medium++;
        break;
      case Complexity.HIGH:
        section.high++;
        break;
      // No default needed due to exhaustive check
    }
  }


}