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
        "A detailed description of the way database integration is achieved (or a note saying no database integration related code exists).",
      ),
    codeExample: z
      .string()
      .describe(
        "A single very small redacted example of some code that performs the database integration (if no database integration, just state 'n/a')",
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
 * Schema for a single data input field from a UI form.
 */
export const dataInputFieldSchema = z
  .object({
    name: z
      .string()
      .describe(
        "The name attribute of the input field (of there is no name, suggest and use an approximate indicative name that reflects its purpose).",
      ),
    type: z.string().describe("The type of the input field (e.g., 'text', 'password', 'hidden')."),
    description: z.string().describe("A detailed description of the input field's purpose."),
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
    classType: z
      .enum(["class", "interface"])
      .optional()
      .describe("The type of the main entity, e.g., 'class' or 'interface'."),
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
    dataInputFields: z
      .array(dataInputFieldSchema)
      .optional()
      .describe("A list of data input fields."),
  })
  .passthrough();

/**
 * File-type specific schemas derived from sourceFileSummarySchema
 * These are used for different file types during ingestion
 */

// Schema for `java-file-summary.prompt`
export const javaFileSummarySchema = sourceFileSummarySchema
  .pick({
    classname: true,
    classType: true,
    classpath: true,
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    publicConstants: true,
    publicMethods: true,
    databaseIntegration: true,
  })
  .extend({
    // Add descriptions for LLM prompts
    internalReferences: z.array(z.string()).describe("A list of internal classpaths referenced."),
    externalReferences: z
      .array(z.string())
      .describe("A list of third-party classpaths referenced."),
  });
export type JavaFileSummary = z.infer<typeof javaFileSummarySchema>;

// Schema for `js-file-summary.prompt`
export const jsFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  internalReferences: true,
  externalReferences: true,
  databaseIntegration: true,
});
export type JsFileSummary = z.infer<typeof jsFileSummarySchema>;

// Schema for `default-file-summary.prompt`
export const defaultFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  databaseIntegration: true,
});
export type DefaultFileSummary = z.infer<typeof defaultFileSummarySchema>;

// Schema for `ddl-file-summary.prompt`
export const ddlFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    tables: true,
    storedProcedures: true,
    triggers: true,
    databaseIntegration: true,
  })
  .extend({
    databaseIntegration: databaseIntegrationSchema.extend({
      mechanism: z.enum(["NONE", "DDL", "DML", "SQL", "STORED-PROCEDURE", "TRIGGER", "FUNCTION"]),
    }),
  });
export type DdlFileSummary = z.infer<typeof ddlFileSummarySchema>;

// Schema for `xml-file-summary.prompt`
export const xmlFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  databaseIntegration: true,
});
export type XmlFileSummary = z.infer<typeof xmlFileSummarySchema>;

// Schema for `jsp-file-summary.prompt`
export const jspFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  internalReferences: true,
  externalReferences: true,
  dataInputFields: true,
});
export type JspFileSummary = z.infer<typeof jspFileSummarySchema>;

// Schema for `markdown-file-summary.prompt`
export const markdownFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  databaseIntegration: true,
});
export type MarkdownFileSummary = z.infer<typeof markdownFileSummarySchema>;

// Strong typing for all possible summary types - need to block lint because it complains that some
// of the types are duplicate but we want to keep them all in case one of the types diverges in the
// future, rather than dropping one of then arbitrarily.
/* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
export type SourceSummaryType =
  | JavaFileSummary
  | JsFileSummary
  | DefaultFileSummary
  | DdlFileSummary
  | XmlFileSummary
  | JspFileSummary
  | MarkdownFileSummary;
/* eslint-enable @typescript-eslint/no-duplicate-type-constituents */
