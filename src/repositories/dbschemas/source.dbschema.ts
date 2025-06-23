import { z } from 'zod';

/**
 * Schema for database integration information
 */
export const databaseIntegrationSchema = z.object({
  mechanism: z.string(),
  description: z.string(),
});

/**
 * Schema for stored procedures and triggers
 */
export const procedureTriggerSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  complexity: z.enum(["low", "medium", "high"]),
  linesOfCode: z.number(),
});

/**
 * Schema for source file summary
 */
export const sourceFileSummarySchema = z.object({
  purpose: z.string(),
  implementation: z.string(),
  classpath: z.string().optional(),
  internalReferences: z.array(z.string()).optional(),
  externalReferences: z.array(z.string()).optional(),
  databaseIntegration: databaseIntegrationSchema.optional(),
  storedProcedures: z.array(procedureTriggerSchema).optional(),
  triggers: z.array(procedureTriggerSchema).optional(),
});

/**
 * Schema for source file record in the database
 */
export const sourceRecordSchema = z.object({
  _id: z.string().optional(),
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
});
