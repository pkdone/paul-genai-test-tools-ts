import { AppSummaryRecord, AppSummaryShortInfo, AppSummaryUpdate } from "../models/app-summary.model";

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
   * Get app summary info for reporting (description and LLM provider)
   */
  getProjectAppSummaryDescAndLLMProvider(projectName: string): Promise<AppSummaryShortInfo | null>;

  /**
   * Get specific field data from app summary
   */
  getProjectAppSummaryField<T>(projectName: string, fieldName: string): Promise<T | null>;
} 