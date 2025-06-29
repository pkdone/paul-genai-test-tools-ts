import { z } from "zod";
import { reportingConfig } from "../../reporting/reporting.config";
import * as insightsPrompts from './insights.prompts';
import * as insightsSchemas from './insights.schemas';

// Type-safe category definitions
export type AppSummaryCategory = keyof typeof reportingConfig.APP_SUMMARIES_CATEGORY_TITLES;

// Declarative mapping for prompts and schemas
export const categoryPromptSchemaMappings: Record<AppSummaryCategory, {
  promptCreator: (codeContent: string) => string;
  schema: z.ZodType;
}> = {
  appDescription: {
    promptCreator: insightsPrompts.createAppDescriptionPrompt,
    schema: insightsSchemas.appDescriptionSchema,
  },
  boundedContexts: {
    promptCreator: insightsPrompts.createBoundedContextsPrompt,
    schema: insightsSchemas.boundedContextsSchema,
  },
  businessEntities: {
    promptCreator: insightsPrompts.createBusinessEntitiesPrompt,
    schema: insightsSchemas.businessEntitiesSchema,
  },
  businessProcesses: {
    promptCreator: insightsPrompts.createBusinessProcessesPrompt,
    schema: insightsSchemas.businessProcessesSchema,
  },
  technologies: {
    promptCreator: insightsPrompts.createTechnologiesPrompt,
    schema: insightsSchemas.technologiesSchema,
  },
} as const; 