import { z } from 'zod';
import { generateMDBJSONSchema, zBsonObjectId } from '../../mdb/zod-to-mdb-json-schema';
 // passthrough() sets "additionalProperties": true

/**
 * Schema for name-description pair used in app summaries
 */
export const appSummaryNameDescSchema = z.object({
  name: z.string(),
  description: z.string(),
}).passthrough();

/**
 * Schema for arrays of name-description pairs used in app summaries
 */
export const appSummaryNameDescArraySchema = z.array(appSummaryNameDescSchema);

/**
 * Zod schema for application summary records in the database
 */
export const appSummaryRecordSchema = z.object({
  _id: zBsonObjectId,
  projectName: z.string(),
  llmProvider: z.string(),
  appDescription: z.string().optional(),
  businessEntities: appSummaryNameDescArraySchema.optional(),
  businessProcesses: appSummaryNameDescArraySchema.optional(),
  businessRules: appSummaryNameDescArraySchema.optional(),
  dataFlow: appSummaryNameDescArraySchema.optional(),
  integrationPoints: appSummaryNameDescArraySchema.optional(),
  qualityIssues: appSummaryNameDescArraySchema.optional(),
  recommendedImprovements: appSummaryNameDescArraySchema.optional(),
  securityConsiderations: appSummaryNameDescArraySchema.optional(),
}).passthrough();

/**
 * Schema for MongoDB projected document with app description and LLM provider fields
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.
 */
export const projectedAppSummaryDescAndLLMProviderSchema = appSummaryRecordSchema.pick({
  appDescription: true,
  llmProvider: true,
});

/**
 * Generate JSON schema for application summary records
 */
export function getJSONSchema() {
  return generateMDBJSONSchema(appSummaryRecordSchema);  
}