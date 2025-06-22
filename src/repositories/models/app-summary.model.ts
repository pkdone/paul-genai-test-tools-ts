/**
 * Type for name-description pair use in app summaries
 */
export type AppSummaryNameDesc = Record<string, string>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = AppSummaryNameDesc[];

/**
 * Interface representing an application summary record in the database
 */
export interface AppSummaryRecord {
  readonly _id?: string;
  readonly projectName: string;
  readonly llmProvider: string;
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
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<AppSummaryRecord>; 

/**
 * Interface for source file summary information
 */
export type AppSummaryDescAndLLMProvider = Pick<PartialAppSummaryRecord,
 "appDescription" | "llmProvider">;
