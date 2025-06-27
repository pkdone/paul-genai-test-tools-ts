import path from "path";
import { injectable, inject } from "tsyringe";
import { logErrorMsgAndDetail, getErrorText } from "../utils/error-utils";
import { LLMStructuredResponseInvoker } from "../llmClient/llm-structured-response-invoker";
import { TOKENS } from "../di/tokens";
import { SummaryType, FileHandler, filePromptSchemaMappings, defaultHandler } from './file-handler-mappings';
import { fileSystemConfig } from "../config/fileSystem.config";

// Result type for better error handling
export type SummaryResult<T = SummaryType> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Responsible for LLM-based file summarization with strong typing and robust error handling.
 */
@injectable()
export class FileSummarizer {
  constructor(
    @inject(TOKENS.LLMStructuredResponseInvoker) private readonly llmUtilityService: LLMStructuredResponseInvoker
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   */
  async getFileSummaryAsJSON(filepath: string, type: string, content: string): Promise<SummaryResult> {
    try {
      if (content.trim().length === 0) return { success: false, error: "File is empty" };
      const handler = this.getFileHandler(filepath, type);  
      const prompt = handler.promptCreator(content);
      const llmResponse = await this.llmUtilityService.getStructuredResponse(
        filepath,
        prompt,
        handler.schema,
        filepath
      );
      return { success: true, data: llmResponse };
    } catch (error) {
      const errorMsg = `Failed to generate summary for '${filepath}'`;
      logErrorMsgAndDetail(errorMsg, error);
      return { success: false, error: `${errorMsg}: ${getErrorText(error)}` };
    }
  }

  /**
   * Get appropriate file handler based on filepath and type.
   */
  private getFileHandler(filepath: string, type: string): FileHandler {
    if (path.basename(filepath).toUpperCase() === fileSystemConfig.README_FILE_NAME) {
      const readmeHandler = filePromptSchemaMappings.get(fileSystemConfig.README_FILE_NAME);
      return readmeHandler ?? defaultHandler;
    } else {
      const handler = filePromptSchemaMappings.get(type.toLowerCase());
      return handler ?? defaultHandler;
    }
  }
} 