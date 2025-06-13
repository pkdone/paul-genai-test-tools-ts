import { Collection, MongoClient } from "mongodb/mongodb";
import { databaseConfig, reportingConfig } from "../config";
import { joinArrayWithSeparators } from "../utils/text-utils";


// Interface for TODO
interface AppSummeriesCollectionRecord {
  projectName: string;
  appdescription: string;
  llmProvider: string;
}

/**
 * Class responsible for generating the HTML report for the application.
 */
export default class AppReportGenerator {
  // Private field for the Mongo Collection
  private readonly currentDate;
  private readonly appSummariesColctn: Collection<AppSummeriesCollectionRecord>;

  /**
   * Constructor
   */
  constructor(readonly mongoDBClient: MongoClient, private readonly projectName: string) { 
    this.currentDate = new Date().toLocaleString();
    const db = mongoDBClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.appSummariesColctn = db.collection(databaseConfig.SUMMARIES_COLLCTN_NAME); 
  }

  /**
   * Gnerate the HTML satic file report.
   */
  async generateHTMLReport() {
    const html: string[] = [];
    html.push(reportingConfig.HTML_PREFIX);
    html.push(`<h1>Codebase Analysis Report</h1>`);
    html.push("<hr/>");
    html.push(...await this.generateAppStatisticsAsHTML());
    html.push(reportingConfig.HTML_SUFFIX);
    return joinArrayWithSeparators(html, "");
  }

  
  /**
   * Generate HTML paragraph containing the previously captured app summary.
   */
  async generateAppStatisticsAsHTML() {    
    const appSummaryRecord = await this.queryAppSummaryInfo();
    if (!appSummaryRecord) throw new Error("Unable to generate app statistics for a report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights");
    const html: string[] = [];
    html.push(`\n<h2>Application Statistics</h2>\n`);
    html.push(this.generateHTMLKeyValueParagraph("Application", this.projectName));
    html.push(this.generateHTMLKeyValueParagraph("Snapshot date/time", this.currentDate));
    html.push(this.generateHTMLKeyValueParagraph("LLM provider", appSummaryRecord.llmProvider));
    //html.push(this.generateHTMLKeyValueParagraph("Number of files", await this.#getSumInProject({"$sum": 1})));
    //html.push(this.generateHTMLKeyValueParagraph("Lines of code", await this.#getSumInProject({"$sum": "$linesCount"})));
    console.log("Generated app summary statistics");
    return html;
  }

  /**
   * Generate a paragraph key-value pair with optional extra info in brackets
   */
  generateHTMLKeyValueParagraph(key: string, value: string, extraInfo = "") {
    const extraContent = extraInfo ? `&nbsp;&nbsp;&nbsp;&nbsp;${extraInfo}` : "";
    return `<p>${key}: <b>${value}</b>${extraContent}</p>`;
  }


  /**
   * Query app summary DB for app description for this project.
   */
  async queryAppSummaryInfo(): Promise<AppSummeriesCollectionRecord | null> {
    const query = { 
      projectName: this.projectName, 
    };
    const options = {
      projection: { _id: 0, appdescription: 1, llmProvider: 1 },
    };
    return await this.appSummariesColctn.findOne(query, options);
  }  
}