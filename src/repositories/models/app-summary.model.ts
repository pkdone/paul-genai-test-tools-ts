/**
 * Type for name-description pair use in app summaries
 */
export type AppSummaryNameDesc = Record<string, string>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = AppSummaryNameDesc[];

/**
 * Type for app summary updates (from LLM responses)
 */
export type AppSummaryUpdate = Record<string, AppSummaryNameDescArray | string>;

/**
 * Interface representing an application summary record in the database
 */
export interface AppSummaryRecord {
  // TODO: remove?
  //readonly [key: string]: unknown; // Allow for additional fields 
  readonly _id?: string;
  readonly projectName: string;
  readonly llmProvider?: string;
  readonly appDescription?: string;
  readonly businessEntities?: AppSummaryNameDescArray;
  readonly businessProcesses?: AppSummaryNameDescArray;
  readonly businessRules?: AppSummaryNameDescArray;
  readonly dataFlow?: AppSummaryNameDescArray;
  readonly integrationPoints?: AppSummaryNameDescArray;
  readonly qualityIssues?: AppSummaryNameDescArray;
  readonly recommendedImprovements?: AppSummaryNameDescArray;
  readonly securityConsiderations?: AppSummaryNameDescArray;
}

/**
 * Interface for source file summary information
 */
export interface AppSummaryShortInfo {
  appdescription?: string;
  llmProvider?: string;
} 
