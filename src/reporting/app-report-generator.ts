import { reportConfig } from "../config";
import { joinArrayWithSeparators } from "../utils/text-utils";

/**
 * Class responsible for generating the HTML report for the application.
 */
export default class AppReportGenerator {
  // Private field for the Mongo Collection

  /**
   * Constructor
   */
  constructor() {
    console.log("AppReportGenerator initialized");
  }

  /**
   * Gnerate the HTML satic file report.
   */
  generateHTMLReport() {
    const htmlSections = [];
    htmlSections.push(reportConfig.HTML_PREFIX);
    htmlSections.push(`<h1>Codebase Analysis Report</h1>`);
    htmlSections.push("<hr/>");
    htmlSections.push(reportConfig.HTML_SUFFIX);
    return joinArrayWithSeparators(htmlSections, "");
  }
}