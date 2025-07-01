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
    purpose: z.string().describe("A detailed definition of the file's purpose."),
    implementation: z.string().describe("A detailed definition of the file's implementation."),
    classname: z.string().optional().describe("The name of the main public class or interface."),
    classpath: z.string().optional().describe("The fully qualified classpath."),
    type: z.enum(["class", "interface"]).optional().describe("The type of the main entity."),
    internalReferences: z.array(z.string()).optional().describe("A list of internal references to other modules in the same project."),
    externalReferences: z.array(z.string()).optional().describe("A list of external references to 3rd party modules outside this project."),
    databaseIntegration: databaseIntegrationSchema
      .optional()
      .describe("Information about how the file interacts with a database."),
    storedProcedures: z
      .array(procedureTriggerSchema)
      .optional()
      .describe("A list of stored procedures defined."),
    triggers: z.array(procedureTriggerSchema).optional().describe("A list of triggers defined."),
    tables: z.array(tablesSchema).optional().describe("A list of tables defined."),
    externalSystemActivities: z
      .array(z.string())
      .optional()
      .describe("A list of external system activities."),
    deployableModules: z.array(z.string()).optional().describe("A list of deployable modules."),
    dataInputFields: z.array(z.string()).optional().describe("A list of data input fields."),
    publicConstants: z
      .array(publicConstantSchema)
      .optional()
      .describe("A list of public constants defined."),
    publicMethods: z.array(publicMethodSchema).optional().describe("A list of public methods."),
  })
  .passthrough();
