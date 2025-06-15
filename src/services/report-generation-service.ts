import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { MongoClient } from "mongodb";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import { TOKENS } from "../di/tokens";
import { fileSystemConfig, reportingConfig } from "../config";
import { clearDirectory, writeFile } from "../utils/fs-utils";
import { getProjectNameFromPath } from "../utils/path-utils";
import path from "path";
import AppReportGenerator from "../dataReporting/reportGeneration/app-report-generator";

/**
 * Service to generate a report of an application's composition.
 */
@injectable()
export class ReportGenerationService implements Service {
  /**
   * Constructor with dependency injection.
   */  
  constructor(
    @inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
  ) {}

  /**
   * Execute the service - generates a report for the codebase.
   */
  async execute(): Promise<void> {
    console.log('Connecting to MongoDB...');
    await this.generateReport(this.env.CODEBASE_DIR_PATH);
  }

  /**
   * Generate a report from the codebase in the specified directory.
   */
  private async generateReport(srcDirPath: string): Promise<void> {
    console.log(`ReportGenerationService: Generating report for source directory: ${srcDirPath}`);    
    const cleanSrcDirPath = srcDirPath.replace(fileSystemConfig.TRAILING_SLASH_PATTERN, "");
    console.log(cleanSrcDirPath);
    await clearDirectory(fileSystemConfig.OUTPUT_DIR);  
    const projectName = getProjectNameFromPath(srcDirPath);      
    console.log(`Creating report for project: ${projectName}`);
    const htmlFilePath = path.join(fileSystemConfig.OUTPUT_DIR, reportingConfig.OUTPUT_SUMMARY_HTML_FILE);
    const appReportGenerator = new AppReportGenerator(this.mongoClient, projectName);
    await writeFile(htmlFilePath, await appReportGenerator.generateHTMLReport());      
    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
