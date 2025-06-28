import { z } from 'zod';

/**
 * Schema for database integration information
 * Used across multiple file summary types and database storage
 */
export const databaseIntegrationSchema = z.object({
  mechanism: z.string(),
  description: z.string(),
}).passthrough();

/**
 * Schema for name-description pairs
 * Used in insights generation and app summaries
 */
export const nameDescSchema = z.object({
  name: z.string(),
  description: z.string(),
}).passthrough();

/**
 * Schema for tables used in DDL files
 */
export const tablesSchema = z.object({
  name: z.string(),
  command: z.string(),
}).passthrough();

/**
 * Schema for stored procedures and triggers
 */
export const procedureTriggerSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  linesOfCode: z.number(),
}).passthrough();

/**
 * Schema for public constants
 */
export const publicConstantSchema = z.object({
  name: z.string(),
  value: z.string(),
  type: z.string(),
}).passthrough();

/**
 * Schema for public methods
 */
export const publicMethodSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  parameters: z.array(z.record(z.string(), z.any())).optional(),
  returnType: z.string(),
  description: z.string(),
}).passthrough(); 