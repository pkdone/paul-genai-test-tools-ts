import { z } from "zod";
import { generateMDBJSONSchema, zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";
import { sourceFileSummarySchema } from "../../schemas/source-summaries.schema";
// Note, `.passthrough()` sets "additionalProperties": true

/**
 * Schema for source file record in the database
 */
export const sourceRecordSchema = z
  .object({
    _id: zBsonObjectId,
    projectName: z.string(),
    filename: z.string(),
    filepath: z.string(),
    type: z.string(),
    linesCount: z.number(),
    summary: sourceFileSummarySchema.optional(),
    summaryError: z.string().optional(),
    summaryVector: z.array(z.number()).optional(),
    content: z.string(),
    contentVector: z.array(z.number()).optional(),
  })
  .passthrough();

/**
 * Interface representing a source file record in the database
 * (making it optional for _id)
 */
type SourceRecordTmp = z.infer<typeof sourceRecordSchema>;
export type SourceRecord = Omit<SourceRecordTmp, "_id"> & Partial<Pick<SourceRecordTmp, "_id">>;

/**
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create schemas inline using sourceRecordSchema.pick() or z.object() since MongoDB projections
 * revert to returning field types of 'unknown'.
 */

/**
 * Type for MongoDB projected document with just filepath
 */
export type ProjectedFilePath = z.infer<
  ReturnType<typeof sourceRecordSchema.pick<{ filepath: true }>>
>;

/**
 * Type for MongoDB projected document with filepath and summary fields
 */
export type ProjectedSourceFilePathAndSummary = z.infer<
  ReturnType<typeof sourceRecordSchema.pick<{ filepath: true; summary: true }>>
>;

/**
 * Type for MongoDB projected document with metadata, content and summary for vector search
 */
export type ProjectedSourceMetataContentAndSummary = z.infer<
  ReturnType<typeof sourceRecordSchema.pick<{
    projectName: true;
    type: true;
    filepath: true;
    content: true;
    summary: true;
  }>>
>;

/**
 * Interface for MongoDB projected document with filepath and partial summary fields
 */
export interface ProjectedSourceSummaryFields {
  filepath: string;
  summary?: z.infer<
    ReturnType<typeof sourceFileSummarySchema.pick<{
      classpath: true;
      purpose: true;
      implementation: true;
    }>>
  >;
}

/**
 * Interface for MongoDB projected document with database integration fields
 */
export interface ProjectedDatabaseIntegrationFields {
  filepath: string;
  summary?: z.infer<
    ReturnType<typeof sourceFileSummarySchema.pick<{
      classpath: true;
      databaseIntegration: true;
    }>>
  >;
}

/**
 * Interface representing
 */
export interface ProjectedFileTypesCountAndLines {
  readonly fileType: string;
  readonly lines: number;
  readonly files: number;
}



/**
 * Generate JSON schema for source file records
 */
export function getJSONSchema() {
  return generateMDBJSONSchema(sourceRecordSchema);
}
