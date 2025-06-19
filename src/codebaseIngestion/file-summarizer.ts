import path from "path";
import LLMRouter from "../llm/llm-router";
import { promptsConfig } from "../config";
import { transformJSToTSFilePath } from "../utils/path-utils";
import { logErrorMsgAndDetail, getErrorText } from "../utils/error-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";
import { BaseFileSummary, JavaScriptFileSummary } from "./types";
import { convertTextToJSON } from "../utils/json-tools";

/**
 * Responsible for LLM-based file summarization including prompt building, LLM interaction, and JSON
 * parsing of summary responses.
 */
export class FileSummarizer {
  // Private fields
  private readonly promptBuilder = new PromptBuilder();

  /**
   * Constructor.
   */
  constructor(private readonly llmRouter: LLMRouter) {}

  /**
   * Generate a summary for the given file content using LLM, returning the response as JSON.
   */
  async getSummaryAsJSON(filepath: string, type: string, content: string): Promise<BaseFileSummary | JavaScriptFileSummary | {content: string} | {error: string}> {
    if (content.length <= 0) return { content: "<empty-file>" };
    
    const promptFileName = this.getPromptTemplateFileName(filepath, type);

    try {
      const contentToReplaceList = [{ label: promptsConfig.PROMPT_CONTENT_BLOCK_LABEL, content }];
      const promptFilePath = transformJSToTSFilePath(__dirname, promptsConfig.PROMPTS_FOLDER_NAME, promptFileName);
      const prompt = await this.promptBuilder.buildPrompt(promptFilePath, contentToReplaceList);
      const llmResponse = await this.llmRouter.executeCompletion(filepath, prompt, true, {resource: filepath, requireJSON: true});

      if (llmResponse === null) {
        logErrorMsgAndDetail(`LLM returned null response for summary of file '${filepath}'`, null);
        return { error: "LLM returned null response" };
      }

      return this.parseLLMResponse(llmResponse, filepath, type);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`No summary generated for file '${filepath}' due to processing error`, error);
      return {error: getErrorText(error)};
    }
  }

  /**
   * Parse the LLM response into the appropriate summary type.
   */
  private parseLLMResponse(llmResponse: unknown, filepath: string, type: string): BaseFileSummary | JavaScriptFileSummary | { error: string } {
    let summaryData: BaseFileSummary | JavaScriptFileSummary | { error: string };

    if (typeof llmResponse === 'string') {
      try {
        if (type === 'js' || type === 'ts') {
          summaryData = convertTextToJSON<JavaScriptFileSummary>(llmResponse);
        } else {
          summaryData = convertTextToJSON<BaseFileSummary>(llmResponse);
        }
      } catch (jsonError: unknown) {
        logErrorMsgAndDetail(`Failed to parse LLM string response to JSON for file '${filepath}'`, jsonError);
        return { error: `Failed to parse LLM JSON: ${getErrorText(jsonError)}` };
      }
    } else if (!Array.isArray(llmResponse)) {
      if (type === 'js' || type === 'ts') {
        summaryData = llmResponse as JavaScriptFileSummary;
      } else {
        summaryData = llmResponse as BaseFileSummary;
      }
    } else {
      logErrorMsgAndDetail(`Unexpected LLM response type for summary of file '${filepath}'. Expected string or object, got ${typeof llmResponse}`, llmResponse);
      return { error: `Unexpected LLM response type: ${typeof llmResponse}` };
    }

    return summaryData;
  }

  /**
   * Determine the appropriate prompt template file name based on the file path and type.
   */
  private getPromptTemplateFileName(filepath: string, type: string): string {
    let promptFileName: string | undefined;
    
    if (path.basename(filepath).toUpperCase() === "README") {
      promptFileName = promptsConfig.MARKDOWN_FILE_SUMMARY_PROMPTS;
    } else {
      promptFileName = this.getSummaryPromptTemplateFileName(type);
    }

    return promptFileName ?? promptsConfig.DEFAULT_FILE_SUMMARY_PROMPTS;
  }

  /**
   * Helper function to get the summary template prompt file name based on the file type.
   */
  private getSummaryPromptTemplateFileName(type: string): string | undefined {
    // Check if the type exists as a key in the FILE_SUMMARY_PROMPTS
    if (Object.hasOwn(promptsConfig.FILE_SUMMARY_PROMPTS, type)) {
      // Use type assertion only after confirming the key exists
      return promptsConfig.FILE_SUMMARY_PROMPTS[type as keyof typeof promptsConfig.FILE_SUMMARY_PROMPTS];
    }
    
    return undefined;
  }
} 