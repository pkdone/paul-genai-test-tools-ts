import { z } from "zod";
import * as summaryPrompts from './prompts';
import * as summarySchemas from './schemas';
import { fileSystemConfig } from "../config/fileSystem.config";

// Strong typing for all possible summary types
export type SummaryType = 
  | summarySchemas.JavaFileSummary
  | summarySchemas.JsFileSummary
  | summarySchemas.DefaultFileSummary
  | summarySchemas.DdlFileSummary
  | summarySchemas.XmlFileSummary
  | summarySchemas.JspFileSummary
  | summarySchemas.MarkdownFileSummary;

// Type-safe file handler configuration
export interface FileHandler<T extends SummaryType = SummaryType> {
  promptCreator: (content: string) => string;
  schema: z.ZodType<T>;
}

// Registry pattern for file type to handler mapping
export const filePromptSchemaMappings = new Map<string, FileHandler>([
  [fileSystemConfig.README_FILE_NAME, { 
    promptCreator: summaryPrompts.createMarkdownSummaryPrompt, 
    schema: summarySchemas.markdownFileSummarySchema 
  }],
  ['java', { 
    promptCreator: summaryPrompts.createJavaSummaryPrompt, 
    schema: summarySchemas.javaFileSummarySchema 
  }],
  ['js', { 
    promptCreator: summaryPrompts.createJsSummaryPrompt, 
    schema: summarySchemas.jsFileSummarySchema 
  }],
  ['ts', { 
    promptCreator: summaryPrompts.createJsSummaryPrompt, 
    schema: summarySchemas.jsFileSummarySchema 
  }],
  ['javascript', { 
    promptCreator: summaryPrompts.createJsSummaryPrompt, 
    schema: summarySchemas.jsFileSummarySchema 
  }],
  ['typescript', { 
    promptCreator: summaryPrompts.createJsSummaryPrompt, 
    schema: summarySchemas.jsFileSummarySchema 
  }],
  ['ddl', { 
    promptCreator: summaryPrompts.createDdlSummaryPrompt, 
    schema: summarySchemas.ddlFileSummarySchema 
  }],
  ['sql', { 
    promptCreator: summaryPrompts.createDdlSummaryPrompt, 
    schema: summarySchemas.ddlFileSummarySchema 
  }],
  ['xml', { 
    promptCreator: summaryPrompts.createXmlSummaryPrompt, 
    schema: summarySchemas.xmlFileSummarySchema 
  }],
  ['jsp', { 
    promptCreator: summaryPrompts.createJspSummaryPrompt, 
    schema: summarySchemas.jspFileSummarySchema 
  }],
  ['markdown', { 
    promptCreator: summaryPrompts.createMarkdownSummaryPrompt, 
    schema: summarySchemas.markdownFileSummarySchema 
  }],
  ['md', { 
    promptCreator: summaryPrompts.createMarkdownSummaryPrompt, 
    schema: summarySchemas.markdownFileSummarySchema 
  }],
]);

// Default handler for unrecognized file types
export const defaultHandler: FileHandler = {
  promptCreator: summaryPrompts.createDefaultSummaryPrompt,
  schema: summarySchemas.defaultFileSummarySchema
}; 