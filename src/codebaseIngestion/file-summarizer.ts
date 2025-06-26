import path from "path";
import { injectable, inject } from "tsyringe";
import LLMRouter from "../llm/llm-router";
import { logErrorMsgAndDetail, getErrorText } from "../utils/error-utils";
import { TOKENS } from "../di/tokens";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as summaryPrompts from './prompts';
import * as summarySchemas from './schemas';

/**
 * Responsible for LLM-based file summarization including prompt building, LLM interaction, and JSON
 * parsing of summary responses with Zod validation.
 */
@injectable()
export class FileSummarizer {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter
  ) {}

  /**
   * Generate a summary for the given file content using LLM, returning the response as validated JSON.
   */
  async getSummaryAsJSON(filepath: string, type: string, content: string): Promise<object | { error: string }> {
    if (content.trim().length <= 0) return { error: "File is empty" };

    const { promptCreator, schema } = this.getPromptAndSchemaForType(filepath, type);
    
    try {
      // Initial attempt
      const filledPrompt = promptCreator(content);
      const llmResponse = await this.llmRouter.executeCompletion(filepath, filledPrompt, true, { resource: filepath, requireJSON: true });

      if (llmResponse === null) {
        const errorMsg = `LLM returned null response for file '${filepath}'`;
        logErrorMsgAndDetail(errorMsg, llmResponse);
        return { error: errorMsg };
      }

      // When asJson=true, LLM router returns parsed object, not string
      let parsedJson: unknown;
      if (typeof llmResponse === 'string') {
        // Fallback: if somehow we get a string, parse it
        try {
          parsedJson = JSON.parse(llmResponse);
        } catch (parseError: unknown) {
          const errorMsg = `Failed to parse LLM response as JSON for file '${filepath}'`;
          logErrorMsgAndDetail(errorMsg, parseError);
          return { error: `${errorMsg}: ${getErrorText(parseError)}` };
        }
      } else if (typeof llmResponse === 'object') {
        // Expected case: LLM router already parsed the JSON
        parsedJson = llmResponse;
      } else {
        const errorMsg = `LLM returned unexpected response type for file '${filepath}': ${typeof llmResponse}`;
        logErrorMsgAndDetail(errorMsg, llmResponse);
        return { error: errorMsg };
      }

      let validationResult = schema.safeParse(parsedJson);

      // Retry logic if validation fails
      if (!validationResult.success) {
        console.warn(`Initial validation failed for ${filepath}. Attempting to self-correct...`);
        logErrorMsgAndDetail(`Zod validation failed for file '${filepath}'`, validationResult.error.format());
        
        const fixItPrompt = `The previous JSON response had validation errors. Please fix the following JSON to strictly match the provided schema.
---
ORIGINAL JSON:
${JSON.stringify(parsedJson)}
---
SCHEMA:
${JSON.stringify(zodToJsonSchema(schema), null, 2)}
---
VALIDATION ERRORS:
${JSON.stringify(validationResult.error.format())}
---
Return ONLY the corrected, valid JSON object.`;
        
        const retryResponse = await this.llmRouter.executeCompletion(`${filepath}-fix`, fixItPrompt, true, { resource: filepath, requireJSON: true });
        
        if (retryResponse === null) {
          return { error: "LLM failed to provide a corrected response." };
        }

        // Handle retry response (should be object when asJson=true)
        if (typeof retryResponse === 'string') {
          try {
            parsedJson = JSON.parse(retryResponse);
          } catch (retryParseError: unknown) {
            logErrorMsgAndDetail(`Error parsing self-corrected response for '${filepath}'`, retryParseError);
            return { error: getErrorText(retryParseError) };
          }
        } else if (typeof retryResponse === 'object') {
          parsedJson = retryResponse;
        } else {
          return { error: `LLM retry returned unexpected response type: ${typeof retryResponse}` };
        }

        validationResult = schema.safeParse(parsedJson);
      }

      if (validationResult.success) {
        return validationResult.data as object; // Type-safe data with explicit cast
      } else {
        const errorMsg = `Zod validation failed for file '${filepath}' after retry.`;
        logErrorMsgAndDetail(errorMsg, validationResult.error.format());
        return { error: `${errorMsg}: ${validationResult.error.message}` };
      }

    } catch (error: unknown) {
      logErrorMsgAndDetail(`No summary generated for file '${filepath}' due to processing error`, error);
      return { error: getErrorText(error) };
    }
  }

  /**
   * Get the appropriate prompt creator function and Zod schema based on file type.
   */
  private getPromptAndSchemaForType(filepath: string, type: string): { 
    promptCreator: (codeContent: string) => string; 
    schema: z.ZodType 
  } {
    // Check for README files first
    if (path.basename(filepath).toUpperCase() === "README") {
      return { 
        promptCreator: summaryPrompts.createMarkdownSummaryPrompt, 
        schema: summarySchemas.markdownFileSummarySchema 
      };
    }

    // Map file types to appropriate prompt creators and schemas
    switch (type.toLowerCase()) {
      case 'java':
        return { 
          promptCreator: summaryPrompts.createJavaSummaryPrompt, 
          schema: summarySchemas.javaFileSummarySchema 
        };
      case 'js':
      case 'ts':
      case 'javascript':
      case 'typescript':
        return { 
          promptCreator: summaryPrompts.createJsSummaryPrompt, 
          schema: summarySchemas.jsFileSummarySchema 
        };
      case 'ddl':
      case 'sql':
        return { 
          promptCreator: summaryPrompts.createDdlSummaryPrompt, 
          schema: summarySchemas.ddlFileSummarySchema 
        };
      case 'xml':
        return { 
          promptCreator: summaryPrompts.createXmlSummaryPrompt, 
          schema: summarySchemas.xmlFileSummarySchema 
        };
      case 'jsp':
        return { 
          promptCreator: summaryPrompts.createJspSummaryPrompt, 
          schema: summarySchemas.jspFileSummarySchema 
        };
      case 'markdown':
      case 'md':
        return { 
          promptCreator: summaryPrompts.createMarkdownSummaryPrompt, 
          schema: summarySchemas.markdownFileSummarySchema 
        };
      default:
        return { 
          promptCreator: summaryPrompts.createDefaultSummaryPrompt, 
          schema: summarySchemas.defaultFileSummarySchema 
        };
    }
  }
} 