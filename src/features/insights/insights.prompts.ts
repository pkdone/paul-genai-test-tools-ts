import { createPromptFromConfig } from "../../llm/utils/prompting/prompt-templator";
import { promptConfig } from "../../llm/utils/prompting/prompt-templator";
import { SummaryCategory, summaryCategoriesConfig } from "../../config/summary-categories.config";

// Base template for all insights generation prompts
const APP_CATEGORY_SUMMARIZER_TEMPLATE =
  "Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{fileContentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.\n\nThe JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n" +
  promptConfig.FORCE_JSON_RESPONSE_TEXT +
  "\n\nSOURCES:\n{{codeContent}}";

/**
 * Generic function to create any insights prompt using the data-driven approach
 */
export const createInsightsPrompt = (type: SummaryCategory, codeContent: string): string => {
  const config = summaryCategoriesConfig[type];
  return createPromptFromConfig(
    APP_CATEGORY_SUMMARIZER_TEMPLATE,
    {
      instructions: config.description,
      schema: config.schema,
      fileContentDesc: "source files",
    },
    codeContent,
  );
};
