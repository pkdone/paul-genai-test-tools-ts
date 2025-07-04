import { injectable } from "tsyringe";
import { reportingConfig } from "./reporting.config";
import { joinArrayWithSeparators } from "../../common/utils/text-utils";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { AppStatistics, ProcsAndTriggers } from "./report-gen.types";
import {
  DatabaseIntegrationInfo,
  ProjectedFileTypesCountAndLines,
} from "../../repositories/source/sources.model";

/**
 * Class responsible for formatting data into HTML presentation format.
 * This class takes aggregated data structures and converts them to HTML.
 */
@injectable()
export class HtmlReportFormatter {
  /**
   * Generate complete HTML report from all data sections
   */
  generateCompleteHTMLReport(
    appStats: AppStatistics,
    fileTypesData: ProjectedFileTypesCountAndLines[],
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
  ): string {
    const html: string[] = [];
    html.push(reportingConfig.HTML_PREFIX);
    html.push(`<h1>Codebase Analysis Report</h1>`);
    html.push("<hr/>");
    html.push(...this.formatAppStatisticsAsHTML(appStats));
    html.push(...this.formatFileTypesAsHTML(fileTypesData));

    for (const categoryData of categorizedData) {
      html.push(
        ...this.formatHTMLTableForCategory(
          categoryData.label,
          categoryData.data,
        ),
      );
    }

    html.push(...this.formatDBIntegrationsListsAsHTML(dbInteractions, procsAndTriggers));
    html.push(reportingConfig.HTML_SUFFIX);
    return joinArrayWithSeparators(html, "");
  }

  /**
   * Format app statistics data as HTML
   */
  formatAppStatisticsAsHTML(appStats: AppStatistics): string[] {
    const html: string[] = [];
    html.push(`\n<h2>Application Statistics</h2>\n`);
    html.push(this.generateHTMLKeyValueParagraph("Application", appStats.projectName));
    html.push(this.generateHTMLKeyValueParagraph("Snapshot date/time", appStats.currentDate));
    html.push(this.generateHTMLKeyValueParagraph("LLM provider", appStats.llmProvider));
    html.push(this.generateHTMLKeyValueParagraph("Number of files", String(appStats.fileCount)));
    html.push(this.generateHTMLKeyValueParagraph("Lines of code", String(appStats.linesOfCode)));
    html.push(`\n<h2>Application Description</h2>\n`);
    html.push(`\n<p>${appStats.appDescription}</p>\n`);
    return html;
  }

  /**
   * Format a category's data as an HTML table
   */
  formatHTMLTableForCategory(
    label: string,
    data: AppSummaryNameDescArray,
  ): string[] {
    const html: string[] = [];
    html.push(`\n<h2>${label}</h2>\n`);
    html.push(...this.generateHTMLTableFromArrayOfObjects(data));
    return html;
  }

  /**
   * Format database integrations and stored procedures/triggers as HTML
   */
  formatDBIntegrationsListsAsHTML(
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
  ): string[] {
    const html: string[] = [];
    html.push(...this.formatDBInteractionsAsHTML(dbInteractions));
    html.push(...this.formatStoredProceduresAndTriggersAsHTML(procsAndTriggers));
    return html;
  }

  /**
   * Format database interactions as HTML
   */
  formatDBInteractionsAsHTML(dbInteractions: DatabaseIntegrationInfo[]): string[] {
    const html: string[] = [];
    html.push(`\n<h2>Database Interactions</h2>\n`);

    if (dbInteractions.length > 0) {
      const dbInteractionsHTML = this.generateHTMLTableFromArrayOfObjects(
        dbInteractions as unknown as Record<string, unknown>[],
      );
      html.push(...dbInteractionsHTML);
    } else {
      html.push("None Found");
    }

    return html;
  }

  /**
   * Format stored procedures and triggers as HTML
   */
  formatStoredProceduresAndTriggersAsHTML(procsAndTriggers: ProcsAndTriggers): string[] {
    const html: string[] = [];
    html.push(`\n<h2>Database Stored Procedures & Triggers</h2>\n`);
    html.push(
      this.generateHTMLKeyValueParagraph("Stored Procedures", String(procsAndTriggers.procs.total)),
      `(complexity: low = ${procsAndTriggers.procs.low}, medium = ${procsAndTriggers.procs.medium}, high = ${procsAndTriggers.procs.high})`,
    );
    html.push(
      this.generateHTMLKeyValueParagraph("Triggers", String(procsAndTriggers.trigs.total)),
      `(complexity: low = ${procsAndTriggers.trigs.low}, medium = ${procsAndTriggers.trigs.medium}, high = ${procsAndTriggers.trigs.high})`,
    );

    if (procsAndTriggers.procs.list.length > 0 || procsAndTriggers.trigs.list.length > 0) {
      const combinedList = [...procsAndTriggers.procs.list, ...procsAndTriggers.trigs.list];
      html.push(...this.generateHTMLTableFromArrayOfObjects(combinedList));
    }

    return html;
  }

  /**
   * Generate a HTML table with header and normal rows from an array of objects (rows).
   */
  generateHTMLTableFromArrayOfObjects(
    keyForArrayOfObjects: Record<string, unknown>[] | null,
  ): string[] {
    if (!keyForArrayOfObjects || keyForArrayOfObjects.length === 0) return [];
    const html: string[] = [];
    html.push("<p><table>");
    const keysOfInterest = Object.keys(keyForArrayOfObjects[0]);
    html.push("<tr>");

    for (const key of keysOfInterest) {
      const capitalizedKey = key.replace(/\b\w/g, (char) => char.toUpperCase());
      html.push(`<th>${capitalizedKey}</th>`);
    }

    html.push("</tr>");

    for (const field of keyForArrayOfObjects) {
      html.push("<tr>");

      for (const key of keysOfInterest) {
        const value = field[key];
        let stringValue = "";

        if (value != null) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            stringValue = String(value);
          } else {
            stringValue = JSON.stringify(value);
          }
        }

        if (key === "link") {
          html.push(`<td><a href="${stringValue}" target="_blank">Link</a></td>`);
        } else if (key === "codeExample") {
          html.push(`<td><pre><code>${stringValue}</code></pre></td>`);
        } else {
          html.push(`<td>${stringValue}</td>`);
        }
      }

      html.push("</tr>");
    }

    html.push("</table></p>");
    return html;
  }

  /**
   * Generate a paragraph key-value pair with optional extra info in brackets
   */
  generateHTMLKeyValueParagraph(key: string, value: string, extraInfo = ""): string {
    const extraContent = extraInfo ? `&nbsp;&nbsp;&nbsp;&nbsp;${extraInfo}` : "";
    return `<p>${key}: <b>${value}</b>${extraContent}</p>`;
  }

  /**
   * Format file types data as HTML
   */
  formatFileTypesAsHTML(fileTypesData: ProjectedFileTypesCountAndLines[]): string[] {
    const html: string[] = [];
    html.push(`\n<h2>File Types Summary</h2>\n`);

    if (fileTypesData.length > 0) {
      // Transform the data to have more readable column headers
      const transformedData = fileTypesData.map((item) => ({
        "File Type": item.fileType,
        "Files Count": item.files,
        "Lines Count": item.lines,
      }));
      html.push(...this.generateHTMLTableFromArrayOfObjects(transformedData));
    } else {
      html.push("<p>No file type data available</p>");
    }

    return html;
  }
}
