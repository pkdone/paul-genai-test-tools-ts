import { z } from "zod";
import { sourceFileSummarySchema } from "../../schemas/source-summary.schema";

// Schema for `java-file-summary.prompt`
export const javaFileSummarySchema = sourceFileSummarySchema
  .pick({
    classname: true,
    type: true,
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
export const jsFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    databaseIntegration: true,
  })
export type JsFileSummary = z.infer<typeof jsFileSummarySchema>;

// Schema for `default-file-summary.prompt`
export const defaultFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
  })
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
    databaseIntegration: z.object({
      mechanism: z.enum(["NONE", "DDL", "DML", "SQL", "STORED-PROCEDURE", "TRIGGER", "FUNCTION"]),
      description: z
        .string()
        .describe("A detailed description of the way database integration is achived."),
    }),
  });
export type DdlFileSummary = z.infer<typeof ddlFileSummarySchema>;

// Schema for `xml-file-summary.prompt`
export const xmlFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
  })
  .extend({
    fileType: z.literal("xml").describe("The file type identifier"),
  });
export type XmlFileSummary = z.infer<typeof xmlFileSummarySchema>;

// Schema for `jsp-file-summary.prompt`
export const jspFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    dataInputFields: true,
  });
export type JspFileSummary = z.infer<typeof jspFileSummarySchema>;

// Schema for `markdown-file-summary.prompt`More actions
export const markdownFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
  })
  .extend({
    fileType: z.literal("markdown").describe("The file type identifier"),
  });
export type MarkdownFileSummary = z.infer<typeof markdownFileSummarySchema>;
