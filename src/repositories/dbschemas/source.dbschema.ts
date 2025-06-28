import { z } from 'zod';
import { generateMDBJSONSchema, zBsonObjectId } from '../../mdb/zod-to-mdb-json-schema';
import { sourceFileSummarySchema } from '../../schemas/source-summary.schema';
// Note, `.passthrough()` sets "additionalProperties": true

/**
 * Schema for source file record in the database
 */
export const sourceRecordSchema = z.object({
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
}).passthrough();

/**
 * Schema for MongoDB projected document with just filepath
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.* 
 */
export const projectedFilePathSchema = sourceRecordSchema.pick({
  filepath: true,
});

/**
 * Schema for MongoDB projected document with filepath and summary fields
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.* 
 */
export const projectedSourceFilePathAndSummarySchema = sourceRecordSchema.pick({
  filepath: true,
  summary: true,
});

/**
 * Schema for MongoDB projected document with metadata, content and summary for vector search
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.* 
 */
export const projectedSourceMetataContentAndSummarySchema = sourceRecordSchema.pick({
  projectName: true,
  type: true,
  filepath: true,
  content: true,
  summary: true,
});

/**
 * Schema for MongoDB projected document with filepath and partial summary fields
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.* 
 */
export const projectedSourceSummaryFieldsSchema = z.object({
  filepath: z.string(),
  summary: sourceFileSummarySchema.pick({
    classpath: true,
    purpose: true,
    implementation: true,
  }).optional(),
});

/**
 * Schema for MongoDB projected document with database integration fields
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.
 */
export const projectedDatabaseIntegrationFieldsSchema = z.object({
  filepath: z.string(),
  summary: sourceFileSummarySchema.pick({
    classpath: true,
    databaseIntegration: true,
  }).optional(),
});

/**
 * Generate JSON schema for source file records
 */
export function getJSONSchema() {
  return generateMDBJSONSchema(sourceRecordSchema);  
}