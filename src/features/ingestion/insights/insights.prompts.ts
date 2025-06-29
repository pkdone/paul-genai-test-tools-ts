import { z } from 'zod';
import * as schemas from './insights.schemas';
import { buildPrompt } from '../../../common/llm/common/prompting/prompt-utils';
import { promptConfig } from '../../../common/llm/common/prompting/prompt.config';

// Base template for all insights generation prompts
const INSIGHTS_BASE_TEMPLATE = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{promptDetails}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${promptConfig.INSIGHTS_BASE_INSTRUCTIONS}

SOURCES:
{{codeContent}}`;

/**
 * Creates a specific insights prompt by injecting details into the base template
 */
function createSpecificInsightsPrompt(details: string, schema: z.ZodType, codeContent: string): string {
  const template = INSIGHTS_BASE_TEMPLATE.replace('{{promptDetails}}', details);
  return buildPrompt(template, schema, codeContent);
}

/**
 * Data-driven mapping of insights prompt types to their specific details and schemas
 */
export const insightsPromptTemplates = {
  appDescription: { 
    details: "the detailed description outlining the application's purpose and implementation. You must write at most 25 sentences for this description.",
    schema: schemas.appDescriptionSchema 
  },
  boundedContexts: { 
    details: "a concise list of the bounded contexts that exist in the application from a Domain Driven Design perspective, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a bounded context often doesn't map to a single source file's code and is usually an aggregate across multiple sources.",
    schema: schemas.boundedContextsSchema 
  },
  businessEntities: { 
    details: "a concise list of the application's main business entities from a Domain Driven Design perspective, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a business entity often doesn't map to a single source file's code and is usually an aggregate across multiple sources.",
    schema: schemas.businessEntitiesSchema 
  },
  businessProcesses: { 
    details: "a concise list of the application's main business processes, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a business process often doesn't map to a single source file's code and is usually an aggregate across multiple sources.",
    schema: schemas.businessProcessesSchema 
  },
  technologies: { 
    details: "a concise list of the key external and host platform technologies depended on by the application, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note the key technologies you catalog should include the programming languages, databases, runtimes, containers, and 3rd party systems (eg, queuing systems, email services, etc).",
    schema: schemas.technologiesSchema 
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
  return createSpecificInsightsPrompt(config.details, config.schema, codeContent);
};

// Backwards compatibility - exported functions that use the new data-driven approach
export const createAppDescriptionPrompt = (codeContent: string): string => {
  return createInsightsPrompt('appDescription', codeContent);
};

export const createBoundedContextsPrompt = (codeContent: string): string => {
  return createInsightsPrompt('boundedContexts', codeContent);
};

export const createBusinessEntitiesPrompt = (codeContent: string): string => {
  return createInsightsPrompt('businessEntities', codeContent);
};

export const createBusinessProcessesPrompt = (codeContent: string): string => {
  return createInsightsPrompt('businessProcesses', codeContent);
};

export const createTechnologiesPrompt = (codeContent: string): string => {
  return createInsightsPrompt('technologies', codeContent);
}; 