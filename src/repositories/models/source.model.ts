import { z } from 'zod';
import { sourceRecordSchema } from "../dbschemas/source.dbschema";

/**
 * Interface representing a source file record in the database
 */
export type SourceRecord = z.infer<typeof sourceRecordSchema>;

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
