import { z } from 'zod';
import { sourceRecordSchema } from "../dbschemas/source.dbschema";


/**
 * Interface representing a source file record in the database
 */
export type SourceRecord = z.infer<typeof sourceRecordSchema>;
/*
// Get the base types from the schemas
type SourceRecordBase = z.infer<typeof sourceRecordSchema>;
export type SourceFileSummary = z.infer<typeof sourceFileSummarySchema>;

// Create the correct type with optional _id while preserving all other fields
export type SourceRecord = Omit<SourceRecordBase, '_id'> & {
  _id?: SourceRecordBase['_id'];
};
*/

/**
 * Type for source file metadata, including project name, type, filepath, and content
 */
export type SourceMetataContentAndSummary = Pick<SourceRecord,
  "projectName" | "type" | "filepath" | "content" | "summary">;

/**
 * Type for source file's filepath and summary, excluding content
 */
export type SourceFilePathAndSummary = Pick<SourceRecord,
  "filepath" | "summary">;

/**
 * Interface representing database integration information
 */
export interface DatabaseIntegrationInfo {
  readonly path: string;
  readonly mechanism: string;
  readonly description: string;
}
