import {
  createPromptFromConfig,
  SimplePromptConfig,
} from "../../llm/utils/prompting/prompt-factory";
import { promptConfig } from "../../llm/utils/prompting/prompt.config";
import {
  appDescriptionSchema,
  boundedContextsSchema,
  businessEntitiesSchema,
  businessProcessesSchema,
  technologiesSchema,
} from "../../schemas/app-summaries.schema";

// Base template for all insights generation prompts
const INSIGHTS_BASE_TEMPLATE = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{promptDetails}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${promptConfig.FORCE_JSON_RESPONSE_SHORT}

SOURCES:
{{codeContent}}`;

// This function is no longer needed - replaced by the generic factory

/**
 * Data-driven mapping of insights prompt types to their specific details and schemas
 */
export const insightsPromptTemplates: Record<string, SimplePromptConfig> = {
  // TODO: use constants, see category-mappings.ts
  appDescription: {
    templateType: "simple",
    details:
      "the detailed description outlining the application's purpose and implementation. You must write at most 25 sentences for this description.",
    schema: appDescriptionSchema,
  },
  // TODO: use constants, see category-mappings.ts
  boundedContexts: {
    templateType: "simple",
    details:
      "a concise list of the bounded contexts that exist in the application from a Domain Driven Design perspective, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a bounded context often doesn't map to a single source file's code and is usually an aggregate across multiple sources.",
    schema: boundedContextsSchema,
  },
  // TODO: use constants, see category-mappings.ts
  businessEntities: {
    templateType: "simple",
    details:
      "a concise list of the application's main business entities from a Domain Driven Design perspective, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a business entity often doesn't map to a single source file's code and is usually an aggregate across multiple sources.",
    schema: businessEntitiesSchema,
  },
  // TODO: use constants, see category-mappings.ts
  businessProcesses: {
    templateType: "simple",
    details:
      "a concise list of the application's main business processes, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a business process often doesn't map to a single source file's code and is usually an aggregate across multiple sources.",
    schema: businessProcessesSchema,
  },
  // TODO: use constants, see category-mappings.ts
  technologies: {
    templateType: "simple",
    details:
      "a concise list of the key external and host platform technologies depended on by the application, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note the key technologies you catalog should include the programming languages, databases, runtimes, containers, and 3rd party systems (eg, queuing systems, email services, etc).",
    schema: technologiesSchema,
  },
} as const;

/**
 * Type for valid insights prompt template keys
 */
export type InsightsPromptType = keyof typeof insightsPromptTemplates;

/**
 * Generic function to create any insights prompt using the data-driven approach
 */
export const createInsightsPrompt = (type: InsightsPromptType, codeContent: string): string => {
  const config = insightsPromptTemplates[type];
  return createPromptFromConfig({ simple: INSIGHTS_BASE_TEMPLATE }, config, codeContent);
};
