/**
 * Interface representing an application summary record in the database
 */
export interface AppSummaryRecord {
  readonly [key: string]: unknown; // Allow for additional fields
  readonly _id?: string;
  readonly projectName: string;
  readonly llmProvider?: string;
  readonly appDescription?: string;
  readonly businessEntities?: string[];
  readonly businessProcesses?: string[];
  readonly businessRules?: string[];
  readonly dataFlow?: string[];
  readonly integrationPoints?: string[];
  readonly qualityIssues?: string[];
  readonly recommendedImprovements?: string[];
  readonly securityConsiderations?: string[];
}

/**
 * Type for partial app summary updates
 */
export type AppSummaryUpdate = Record<string, unknown>; 