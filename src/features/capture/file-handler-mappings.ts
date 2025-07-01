import { z } from "zod";
import * as summaryPrompts from "./ingestion.prompts";
import * as summarySchemas from "./ingestion.schemas";
import { appConfig } from "../../config/app.config";

// Strong typing for all possible summary types
export type SummaryType =
  | summarySchemas.JavaFileSummary
  | summarySchemas.JsFileSummary
  | summarySchemas.DefaultFileSummary
  | summarySchemas.DdlFileSummary
  | summarySchemas.JspFileSummary;

// Type-safe file handler configuration
export interface FileHandler<T extends SummaryType = SummaryType> {
  promptCreator: (content: string) => string;
  schema: z.ZodType<T>;
}

// Registry pattern for file type to handler mapping
export const filePromptSchemaMappings = new Map<string, FileHandler>([
  [
    appConfig.README_FILE_NAME,
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("markdown", content),
      schema: summarySchemas.defaultFileSummarySchema,
    },
  ],
  [
    "java",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("java", content),
      schema: summarySchemas.javaFileSummarySchema,
    },
  ],
  [
    "js",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("js", content),
      schema: summarySchemas.jsFileSummarySchema,
    },
  ],
  [
    "ts",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("js", content),
      schema: summarySchemas.jsFileSummarySchema,
    },
  ],
  [
    "javascript",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("js", content),
      schema: summarySchemas.jsFileSummarySchema,
    },
  ],
  [
    "typescript",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("js", content),
      schema: summarySchemas.jsFileSummarySchema,
    },
  ],
  [
    "ddl",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("ddl", content),
      schema: summarySchemas.ddlFileSummarySchema,
    },
  ],
  [
    "sql",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("ddl", content),
      schema: summarySchemas.ddlFileSummarySchema,
    },
  ],
  [
    "xml",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("xml", content),
      schema: summarySchemas.defaultFileSummarySchema,
    },
  ],
  [
    "jsp",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("jsp", content),
      schema: summarySchemas.jspFileSummarySchema,
    },
  ],
  [
    "markdown",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("markdown", content),
      schema: summarySchemas.defaultFileSummarySchema,
    },
  ],
  [
    "md",
    {
      promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("markdown", content),
      schema: summarySchemas.defaultFileSummarySchema,
    },
  ],
]);

// Default handler for unrecognized file types
export const defaultHandler: FileHandler = {
  promptCreator: (content: string) => summaryPrompts.createSummaryPrompt("default", content),
  schema: summarySchemas.defaultFileSummarySchema,
};
