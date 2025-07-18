import { injectable } from "tsyringe";
import path from "path";
import { appConfig } from "../../config/app.config";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { ProjectedFileTypesCountAndLines } from "../../repositories/source/sources.model";
import { writeFile } from "../../common/utils/fs-utils";

interface EjsTemplateData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[];
  dbInteractions: DatabaseIntegrationInfo[];
  procsAndTriggers: ProcsAndTriggers;
  convertToDisplayName: (text: string) => string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ejs = require("ejs") as {
  renderFile: (path: string, data: EjsTemplateData) => Promise<string>;
};

/**
 * Class responsible for formatting data into HTML presentation format using EJS templates.
 * This class takes aggregated data structures and converts them to HTML using template files.
 */
@injectable()
export class HtmlReportFormatter {
  /**
   * Generate complete HTML report from all data sections using EJS templates.
   * Also writes JSON files for each category.
   */
  async generateCompleteHTMLReport(
    appStats: AppStatistics,
    fileTypesData: ProjectedFileTypesCountAndLines[],
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
  ): Promise<string> {
    await this.writeJSONFiles(categorizedData);
    const templatePath = path.join(
      __dirname,
      appConfig.HTML_TEMPLATES_DIR,
      appConfig.HTML_MAIN_TEMPLATE_FILE,
    );
    const data: EjsTemplateData = {
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
      convertToDisplayName: this.convertToDisplayName.bind(this),
    };
    return await ejs.renderFile(templatePath, data);
  }

  /**
   * Write JSON files for each category of data.
   */
  private async writeJSONFiles(
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
  ): Promise<void> {
    console.log("Generating JSON files for each category...");
    const jsonFilePromises = categorizedData.map(async (categoryData) => {
      const jsonFileName = `${categoryData.category}.json`;
      const jsonFilePath = path.join(appConfig.OUTPUT_DIR, jsonFileName);
      const jsonContent = JSON.stringify(categoryData.data, null, 2);
      await writeFile(jsonFilePath, jsonContent);
      console.log(`Generated JSON file: ${jsonFileName}`);
    });
    await Promise.all(jsonFilePromises);
    console.log("Finished generating JSON files for all categories");
  }

  /**
   * Convert camelCase or compound words to space-separated words with proper capitalization.
   */
  private convertToDisplayName(text: string): string {
    const spacedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spacedText.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
