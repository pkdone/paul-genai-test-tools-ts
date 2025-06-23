import { z } from 'zod';
import { appSummaryNameDescSchema, appSummaryNameDescArraySchema, appSummaryRecordSchema }
       from "../dbschemas/app-summary.dbschema";

/**
 * Type for name-description pair use in app summaries
 */
export type AppSummaryNameDesc = z.infer<typeof appSummaryNameDescSchema>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = z.infer<typeof appSummaryNameDescArraySchema>;

/**
 * Interface representing an application summary record in the database
 */
export type AppSummaryRecord = z.infer<typeof appSummaryRecordSchema>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<AppSummaryRecord>; 

/**
 * Interface for source file summary information
 */
export type AppSummaryDescAndLLMProvider = Pick<PartialAppSummaryRecord,
 "appDescription" | "llmProvider">;
