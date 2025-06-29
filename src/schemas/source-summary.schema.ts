import { z } from "zod";
import {
  databaseIntegrationSchema,
  tablesSchema,
  procedureTriggerSchema,
  publicConstantSchema,
  publicMethodSchema,
} from "./common.schemas";

/**
 * Canonical schema for source file summaries
 * This is the single source of truth for what a file summary can contain
 * All other summary schemas should be derived from this one
 */
export const sourceFileSummarySchema = z
  .object({
    purpose: z.string(),
    implementation: z.string(),
    classname: z.string().optional(),
    classpath: z.string().optional(),
    type: z.enum(["class", "interface"]).optional(),
    internalReferences: z.array(z.string()).optional(),
    externalReferences: z.array(z.string()).optional(),
    databaseIntegration: databaseIntegrationSchema.optional(),
    storedProcedures: z.array(procedureTriggerSchema).optional(),
    triggers: z.array(procedureTriggerSchema).optional(),
    tables: z.array(tablesSchema).optional(),
    externalSystemActivities: z.array(z.string()).optional(),
    deployableModules: z.array(z.string()).optional(),
    dataInputFields: z.array(z.string()).optional(),
    publicConstants: z.array(publicConstantSchema).optional(),
    publicMethods: z.array(publicMethodSchema).optional(),
  })
  .passthrough();

export type SourceFileSummary = z.infer<typeof sourceFileSummarySchema>;
