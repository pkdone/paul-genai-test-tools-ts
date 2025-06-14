import { AppSummaryRecord, AppSummaryUpdate } from "../models/app-summary.model";

/**
 * Interface for the App Summaries repository
 */
export interface IAppSummariesRepository {
  /**
   * Create or replace an app summary record
   */
  createOrReplaceAppSummary(projectName: string, data: Partial<AppSummaryRecord>): Promise<void>;

  /**
   * Update an existing app summary record
   */
  updateAppSummary(projectName: string, updates: AppSummaryUpdate): Promise<void>;

  /**
   * Get an app summary record by project name
   */
  getAppSummary(projectName: string): Promise<AppSummaryRecord | null>;

  /**
   * Get all app summaries
   */
  getAllAppSummaries(): Promise<AppSummaryRecord[]>;

  /**
   * Delete an app summary record
   */
  deleteAppSummary(projectName: string): Promise<void>;

  /**
   * Get app summary info for reporting (description and LLM provider)
   */
  getAppSummaryInfo(projectName: string): Promise<{
    appdescription?: string;
    llmProvider?: string;
  } | null>;

  /**
   * Get specific field data from app summary
   */
  getAppSummaryField<T = string>(projectName: string, fieldName: string): Promise<T | null>;
} 