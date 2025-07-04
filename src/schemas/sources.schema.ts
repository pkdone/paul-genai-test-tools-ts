import { z } from "zod";

/**
 * Schema for database integration information
 * Used across multiple file summary types and database storage
 */
export const databaseIntegrationSchema = z
  .object({
    mechanism: z
      .enum([
        "NONE",
        "JDBC",
        "SPRING-DATA",
        "SQL",
        "HIBERNATE",
        "JPA",
        "MQL",
        "ORM",
        "EJB",
        "DDL",
        "DML",
        "STORED-PROCEDURE",
        "TRIGGER",
        "FUNCTION",
        "OTHER",
      ])
      .describe("The database integration mechanism used."),
    description: z
      .string()
      .describe(
        "A detailed description of the way database integration is achived (or a note saying no database integration related code exists).",
      ),
  })
  .passthrough();

/**
 * Schema for tables used in DDL files
 */
export const tablesSchema = z
  .object({
    name: z.string().describe("The name of the table."),
    command: z.string().describe("The DDL command for the table."),
  })
  .passthrough();

/**
 * Schema for stored procedures and triggers
 */
export const procedureTriggerSchema = z
  .object({
    name: z.string().describe("The name of the procedure or trigger."),
    purpose: z.string().describe("Detailed purpose in at least 3 sentences."),
    complexity: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Complexity score."),
    complexityReason: z
      .string()
      .describe("A brief, one-sentence reason for the chosen complexity score."),
    linesOfCode: z.number().describe("Number of lines of code it contains."),
  })
  .passthrough();

/**
 * Schema for public constants
 */
export const publicConstantSchema = z
  .object({
    name: z.string().describe("The name of the constant."),
    value: z.string().describe("The value of the constant."),
    type: z.string().describe("The type of the constant."),
  })
  .passthrough();

/**
 * Provides type safety for method parameter definitions
 */
export const methodParameterSchema = z
  .object({
    name: z.string().describe("The name of the parameter."),
    type: z.string().describe("The type of the parameter."),
  })
  .passthrough();

/**
 * Schema for public methods
 */
export const publicMethodSchema = z
  .object({
    name: z.string().describe("The name of the method/function."),
    purpose: z.string().describe("Detailed purpose of the method/function in atleast 3 sentences."),
    parameters: z
      .array(methodParameterSchema)
      .optional()
      .describe("List parameters of the method/function."),
    returnType: z.string().describe("The return type of the method/function."),
    description: z
      .string()
      .describe("Detailed description of how the method/function is implementated."),
  })
  .passthrough();

/**
 * Canonical schema for source file summaries
 * This is the single source of truth for what a file summary can contain
 * All other summary schemas should be derived from this one
 */
export const sourceFileSummarySchema = z
  .object({
    purpose: z
      .string()
      .describe("A detailed definition of the file's purpose in at least 3 sentences."),
    implementation: z
      .string()
      .describe("A detailed definition of the file's implementation in at least 3 sentences."),
    classname: z.string().optional().describe("The name of the main public class or interface."),
    classpath: z.string().optional().describe("The fully qualified classpath."),
    type: z.enum(["class", "interface"]).optional().describe("The type of the main entity."),
    internalReferences: z
      .array(z.string())
      .optional()
      .describe("A list of internal references to other modules in the same project."),
    externalReferences: z
      .array(z.string())
      .optional()
      .describe("A list of external references to 3rd party modules outside this project."),
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
    publicConstants: z
      .array(publicConstantSchema)
      .optional()
      .describe("A list of public constants defined."),
    publicMethods: z
      .array(publicMethodSchema)
      .optional()
      .describe("A list of public methods/functions)."),
    databaseIntegration: databaseIntegrationSchema
      .optional()
      .describe("Information about how the file interacts with a database."),
    dataInputFields: z.array(z.string()).optional().describe("A list of data input fields."),
  })
  .passthrough();
