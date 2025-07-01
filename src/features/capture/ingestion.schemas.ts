import { z } from "zod";
import { sourceFileSummarySchema } from "../../schemas/source-summary.schema";

// Schema for `java-file-summary.prompt`
export const javaFileSummarySchema = sourceFileSummarySchema.pick({
  classname: true,
  type: true,
  classpath: true,
  purpose: true,
  implementation: true,
  internalReferences: true,
  externalReferences: true,
  publicConstants: true,
  publicMethods: true,
});
export type JavaFileSummary = z.infer<typeof javaFileSummarySchema>;

// Schema for `js-file-summary.prompt`
export const jsFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  internalReferences: true,
  externalReferences: true,
});
export type JsFileSummary = z.infer<typeof jsFileSummarySchema>;

// Schema for `default-file-summary.prompt`
export const defaultFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
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
  })
  .extend({
    databaseIntegration: z.object({
      mechanism: z
        .enum(["NONE", "DDL", "DML", "SQL", "STORED-PROCEDURE", "TRIGGER", "FUNCTION"])
        .describe("The database integration mechanism used."),
      description: z.string().describe("A detailed description of the database integration."),
    }),
  });
export type DdlFileSummary = z.infer<typeof ddlFileSummarySchema>;

// Schema for `jsp-file-summary.prompt`
export const jspFileSummarySchema = sourceFileSummarySchema.pick({
  purpose: true,
  implementation: true,
  internalReferences: true,
  externalReferences: true,
  dataInputFields: true,
});
export type JspFileSummary = z.infer<typeof jspFileSummarySchema>;
