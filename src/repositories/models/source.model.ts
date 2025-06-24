import { z } from 'zod';
import { sourceRecordSchema, projectedFilePathSchema, projectedSourceFilePathAndSummarySchema,
         projectedSourceMetataContentAndSummarySchema, projectedSourceSummaryFieldsSchema,
         projectedDatabaseIntegrationFieldsSchema} from "../dbschemas/source.dbschema";

/**
 * Interface representing a source file record in the database
 * (making it optional for _id)
 */
type SourceRecordTmp = z.infer<typeof sourceRecordSchema>;
export type SourceRecord = Omit<SourceRecordTmp, "_id"> & Partial<Pick<SourceRecordTmp, "_id">>; 

/**
 * Type for MongoDB projected document with just filepath
 */
export type ProjectedFilePath = z.infer<typeof projectedFilePathSchema>;

/**
 * Type for MongoDB projected document with filepath and summary fields
 */
export type ProjectedSourceFilePathAndSummary = z.infer<typeof projectedSourceFilePathAndSummarySchema>;

/**
 * Type for MongoDB projected document with filepath, summary, and partial summary fields
 */
export type ProjectedSourceSummaryFields = z.infer<typeof projectedSourceSummaryFieldsSchema>;

/**
 * Type for MongoDB projected document with database integration fields
 */
export type ProjectedDatabaseIntegrationFields = z.infer<typeof projectedDatabaseIntegrationFieldsSchema>;

/**
 * Type for MongoDB projected document with metadata, content and summary for vector search
 */
export type ProjectedSourceMetataContentAndSummary = z.infer<typeof projectedSourceMetataContentAndSummarySchema>;

/**
 * Interface representing database integration information
 */
export interface DatabaseIntegrationInfo {
  readonly path: string;
  readonly mechanism: string;
  readonly description: string;
}
