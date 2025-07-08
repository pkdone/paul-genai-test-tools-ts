import path from "path";
import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { logErrorMsgAndDetail, getErrorText } from "../../common/utils/error-utils";
import { LLMStructuredResponseInvoker } from "../../llm/utils/llm-structured-response-invoker";
import { TOKENS } from "../../di/tokens";
import { SourceSummaryType } from "../../schemas/source-summaries.schema";
import { fileTypeMetataDataAndPromptTemplate } from "./file-handler.config";
import { createPromptFromConfig } from "../../llm/utils/prompting/prompt-templator";
import { appConfig } from "../../config/app.config";

// Base template for detailed file summary prompts (Java, JS, etc.)
const SOURCES_SUMMARY_CAPTURE_TEMPLATE = `Act as a programmer. Take the {{fileContentDesc}} shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

{{specificInstructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CODE:
{{codeContent}}`;

// Result type for better error handling
export type SummaryResult<T = SourceSummaryType> =
  | { success: true; data: T }
  | { success: false; error: string };

// Type-safe file handler configuration
export interface FileHandler<T extends SourceSummaryType = SourceSummaryType> {
  promptCreator: (content: string) => string;
  schema: z.ZodType<T>;
}

/**
 * Responsible for LLM-based file summarization with strong typing and robust error handling.
 */
@injectable()
export class FileSummarizer {
  constructor(
    @inject(TOKENS.LLMStructuredResponseInvoker)
    private readonly llmUtilityService: LLMStructuredResponseInvoker,
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   */
  async getFileSummaryAsJSON(
    filepath: string,
    type: string,
    content: string,
  ): Promise<SummaryResult> {
    try {
      if (content.trim().length === 0) return { success: false, error: "File is empty" };
      const handler = this.getFileTemplatorAndSchema(filepath, type);
      const prompt = handler.promptCreator(content);
      const llmResponse = await this.llmUtilityService.getStructuredResponse(
        filepath,
        prompt,
        handler.schema,
        filepath,
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
  private getFileTemplatorAndSchema(filepath: string, type: string): FileHandler {
    // Handle special filename cases using data-driven configuration
    let fileType = type;
    const filename = path.basename(filepath).toLowerCase();

    // Check if this specific filename has a canonical type mapping
    const canonicalType = appConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.get(filename);

    if (canonicalType) {
      fileType = canonicalType;
    }

    // Use the prompt type to determine the schema, ensuring consistency
    const promptType =
      appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.get(fileType.toLowerCase()) ??
      appConfig.DEFAULT_FILE_TYPE;
    const config =
      fileTypeMetataDataAndPromptTemplate[promptType] ??
      fileTypeMetataDataAndPromptTemplate.default;
    const schema = config.schema as z.ZodType<SourceSummaryType>;
    return {
      promptCreator: (content: string) => this.createPromptForFileType(fileType, content),
      schema,
    };
  }

  /**
   * Create prompts for file types.
   */
  private createPromptForFileType(fileType: string, content: string): string {
    // Normalize file type to supported prompt types
    const promptType =
      appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.get(fileType.toLowerCase()) ??
      appConfig.DEFAULT_FILE_TYPE;
    const config = fileTypeMetataDataAndPromptTemplate[promptType];
    return createPromptFromConfig(SOURCES_SUMMARY_CAPTURE_TEMPLATE, config, content);
  }
}
