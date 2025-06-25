import { z } from 'zod';
import { appSummaryNameDescSchema, appSummaryNameDescArraySchema, appSummaryRecordSchema,
         projectedAppSummaryDescAndLLMProviderSchema }
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
 * (making it optional for _id)
 */
type AppSummaryRecordTmp = z.infer<typeof appSummaryRecordSchema>;
export type AppSummaryRecord = Omit<AppSummaryRecordTmp, "_id"> & Partial<Pick<AppSummaryRecordTmp, "_id">>; 

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<AppSummaryRecord>; 

/**
 * Type for MongoDB projected document with app description and LLM provider fields
 */
export type ProjectedAppSummaryDescAndLLMProvider = z.infer<typeof projectedAppSummaryDescAndLLMProviderSchema>;
