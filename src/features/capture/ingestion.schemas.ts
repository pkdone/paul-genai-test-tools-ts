import { z } from "zod";
import { sourceFileSummarySchema, databaseIntegrationSchema } from "../../schemas/sources.schema";

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

// Schema for `markdown-file-summary.prompt`More actions
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
export type SummaryType =
  | JavaFileSummary
  | JsFileSummary
  | DefaultFileSummary
  | DdlFileSummary
  | XmlFileSummary
  | JspFileSummary
  | MarkdownFileSummary;
/* eslint-enable @typescript-eslint/no-duplicate-type-constituents */
