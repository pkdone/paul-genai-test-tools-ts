import { createPromptFromConfig } from "../../llm/utils/prompting/prompt-factory";
import { promptConfig } from "../../llm/utils/prompting/prompt.config";
import { AppSummaryCategory, appSummaryCategoryConfig } from "./insights.config";

// Base template for all insights generation prompts
const INSIGHTS_BASE_TEMPLATE = "Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{promptDetails}}.\n\nThe JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n" + promptConfig.FORCE_JSON_RESPONSE_LONG + "\n\nSOURCES:\n{{codeContent}}";

/**
 * Generic function to create any insights prompt using the data-driven approach
 */
export const createInsightsPrompt = (type: AppSummaryCategory, codeContent: string): string => {
  const config = appSummaryCategoryConfig[type];
  return createPromptFromConfig(
    { simple: INSIGHTS_BASE_TEMPLATE },
    {
      templateType: "simple",
      details: config.promptDetails,
      schema: config.schema,
    },
    codeContent,
  );
};
