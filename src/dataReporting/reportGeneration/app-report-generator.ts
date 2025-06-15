import { Collection, MongoClient } from "mongodb/mongodb";
import { databaseConfig, reportingConfig } from "../../config";
import { joinArrayWithSeparators } from "../../utils/text-utils";
import CodeMetadataQueryer from "../../dataCapture/insightsFromDBGeneration/code-metadata-queryer";

// Interface for what we need from the AppSummaries collection
interface AppSummariesCollRecord {
  projectName: string;
  appdescription: string;
  llmProvider: string;
}

// Interface for the aggregation $sum command to be sent
interface SumCommand {
  "$sum": number | string;  // Literal or agg exx`x`pression that should resolve to a literal
}

// Interface for the aggregation count response from issuing the $sum command
interface SumResponse {
  "count": number;
}

/**
 * Class responsible for generating the HTML report for the application.
 */
export default class AppReportGenerator {
  // Private field for the Mongo Collection
  private readonly currentDate;
  private readonly sourcesColctn;
  private readonly appSummariesColctn: Collection<AppSummariesCollRecord>;
  private readonly codeMetadataQueryer;


  /**
   * Constructor
   */
  constructor(readonly mongoDBClient: MongoClient, private readonly projectName: string) { 
    this.currentDate = new Date().toLocaleString();
    const db = mongoDBClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.sourcesColctn = db.collection(databaseConfig.SOURCES_COLLCTN_NAME);
    this.appSummariesColctn = db.collection(databaseConfig.SUMMARIES_COLLCTN_NAME); 
    this.codeMetadataQueryer = new CodeMetadataQueryer(mongoDBClient, databaseConfig.CODEBASE_DB_NAME, databaseConfig.SOURCES_COLLCTN_NAME, this.projectName);
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

    for (const category of reportingConfig.APP_SUMMARY_ARRAY_FIELDS_TO_GENERATE_KEYS) {
      html.push(...await this.generateHTMLTableForCategory(category, reportingConfig.CATEGORY_TITLES[category]));
    }

    html.push(...await this.generateDBIntegrationsListsAsHTML());
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
    html.push(this.generateHTMLKeyValueParagraph("Number of files", String(await this.getSumInProject({"$sum": 1}))));
    html.push(this.generateHTMLKeyValueParagraph("Lines of code", String(await this.getSumInProject({"$sum": "$linesCount"}))));
    html.push(`\n<h2>Application Description</h2>\n`);
    html.push(`\n<p>${appSummaryRecord.appdescription}</p>\n`);
    return html;
  }

  /*
   * For a given cateogory (e.g. business process), retrieve the list of that type from the 
   * databases and generate a snipped of HTML to output the date for that category.
   */
  async generateHTMLTableForCategory(category: string, label: string) {
    const html: string[] = [];
    html.push(`\n<h2>${label}</h2>\n`);
    const componentList = await this.queryAppSummaryCollectionSubDocuments(category);    
    html.push(...this.generateHTMLTableFromArrayOfObjects(componentList));
    console.log(`Generated ${label} table`);
    return html;
  }

  /**
   * Generate a HTML table with header and normal rows from an array of objects (rows).
   */
  private generateHTMLTableFromArrayOfObjects(keyForArrayOfObjects: Record<string, string | number>[] | null) {
    if (!keyForArrayOfObjects || keyForArrayOfObjects.length === 0) return [];
    const html: string[] = [];
    html.push("<p><table>");
    const keysOfInterest = Object.keys(keyForArrayOfObjects[0]); // Now safe
    html.push("<tr>");

    for (const key of keysOfInterest) {
      const capitalizedKey = key.replace(/\b\w/g, char => char.toUpperCase());
      html.push(`<th>${capitalizedKey}</th>`);
    }

    html.push("</tr>");
    
    for (const field of keyForArrayOfObjects) {
      html.push("<tr>");

      for (const key of keysOfInterest) {
        const value = field[key] ?? "";
        
        if (key === "link") {
          html.push(`<td><a href="${value}" target="_blank">Link</a></td>`);
        } else {
          html.push(`<td>${value}</td>`);
        }
      }

      html.push("</tr>");
    }

    html.push("</table></p>");
    return html;
  }

  /*
   * Generate HTML tables for the lists of DB interactions and the list of StoredProcs/Triggers.
   */
  private async generateDBIntegrationsListsAsHTML() {    
    const html: string[] = [];
    html.push(...await this.generateDBInteractionsAsHTML());
    html.push(...await this.getStoredProceduresAndTriggersAsHTML());
    return html;
  }

  /**
   * Grab the generated DB interactions metadata for all code files in the project and put them in 
   * a summary HTML snippet.
   */
 private  async generateDBInteractionsAsHTML() {    
    const dbIntegrationsList = await this.codeMetadataQueryer.buildDBInteractionList();
    const html: string[] = [];
    html.push(`\n<h2>Database Interactions</h2>\n`);

    if (dbIntegrationsList.length > 0) {
      const dbInteractionsHTML = this.generateHTMLTableFromArrayOfObjects(dbIntegrationsList);
      html.push(...dbInteractionsHTML);
      console.log("Generated DB interactions list");
    } else {
      html.push("None Found");
      console.warn("No DB integration instances found (maybe because for the programmng language, the LLM/Prompt is unable to correctly identify DB interactions)");
    }
    
    return html;
  }

  /*
   * Grab the generated DB stored procedures triggers metadata for all code files in the project 
   * and put them in a summary HTML snippet.
   */
  private async getStoredProceduresAndTriggersAsHTML() {    
    const procsAndTriggers = await this.codeMetadataQueryer.buildDBStoredProcsTriggersSummaryList();
    console.log(procsAndTriggers);
    const html: string[] = [];
    html.push(`\n<h2>Database Stored Procedures & Triggers</h2>\n`);
    html.push(this.generateHTMLKeyValueParagraph("Stored Procedures", String(procsAndTriggers.procs.total)),
      `(complexity: low = ${procsAndTriggers.procs.low}, medium = ${procsAndTriggers.procs.medium}, high = ${procsAndTriggers.procs.high})`);
    html.push(this.generateHTMLKeyValueParagraph("Triggers", String(procsAndTriggers.trigs.total)),
      `(complexity: low = ${procsAndTriggers.trigs.low}, medium = ${procsAndTriggers.trigs.medium}, high = ${procsAndTriggers.trigs.high})`);

    if (procsAndTriggers.procs.list.length > 0 || procsAndTriggers.trigs.list.length > 0) {
      const combinedList = [...procsAndTriggers.procs.list, ...procsAndTriggers.trigs.list];
      html.push(...this.generateHTMLTableFromArrayOfObjects(combinedList));
      console.log("Generated DB stored procedures and triggers list");
    } else {
      console.log("No DB stored procedures and triggers found");
    }

    return html;
  }


  /**
   * Generate a paragraph key-value pair with optional extra info in brackets
   */
  private generateHTMLKeyValueParagraph(key: string, value: string, extraInfo = "") {
    const extraContent = extraInfo ? `&nbsp;&nbsp;&nbsp;&nbsp;${extraInfo}` : "";
    return `<p>${key}: <b>${value}</b>${extraContent}</p>`;
  }

  /**
   * Query app summary DB for app description for this project.
   */
  private async queryAppSummaryInfo(): Promise<AppSummariesCollRecord | null> {
    const query = { 
      projectName: this.projectName, 
    };
    const options = {
      projection: { _id: 0, appdescription: 1, llmProvider: 1 },
    };
    return await this.appSummariesColctn.findOne(query, options);
  }  

  /**
   * Query the appSummaries collection to locate the specific appSummary record for the current 
   * project name and return the array of sub-documents for a named fied in this record.
   */
  private async queryAppSummaryCollectionSubDocuments(fieldname: string): Promise<Record<string, string>[] | null> {
    const query = { 
      projectName: this.projectName, 
    };
    const options = {
      projection: { _id: 0, [fieldname]: 1 },
    };
    const record = await this.appSummariesColctn.findOne<Record<string, Record<string, string>[]>>(query, options);
    return record?.[fieldname] ?? null;
  }  

  /**
   * Aggregate by performing a sum for against all captued files for this project.
   */
  private async getSumInProject(sumOperationCmnd: SumCommand): Promise<number> {
    const pipeline = [
      {$match: {
        projectName: this.projectName,
      }},
    
      {$group: {
        _id: "",
        count: sumOperationCmnd,
      }},    
    ];

    const result = this.sourcesColctn.aggregate<SumResponse>(pipeline);
    const payload = await result.toArray();
    return payload[0].count;
  }  
}