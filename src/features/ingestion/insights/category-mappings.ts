import { z } from "zod";
import * as insightsPrompts from './insights.prompts';
import * as insightsSchemas from './insights.schemas';

// Type-safe category definitions
export type AppSummaryCategory = 'appDescription' | 'boundedContexts' | 'businessEntities' | 'businessProcesses' | 'technologies';

// Declarative mapping for prompts, schemas, and labels
export const categoryPromptSchemaMappings: Record<AppSummaryCategory, {
  label: string;
  promptCreator: (codeContent: string) => string;
  schema: z.ZodType;
}> = {
  appDescription: {
    label: "Application Description",
    promptCreator: insightsPrompts.createAppDescriptionPrompt,
    schema: insightsSchemas.appDescriptionSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    promptCreator: insightsPrompts.createBoundedContextsPrompt,
    schema: insightsSchemas.boundedContextsSchema,
  },
  businessEntities: {
    label: "Business Entities",
    promptCreator: insightsPrompts.createBusinessEntitiesPrompt,
    schema: insightsSchemas.businessEntitiesSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    promptCreator: insightsPrompts.createBusinessProcessesPrompt,
    schema: insightsSchemas.businessProcessesSchema,
  },
  technologies: {
    label: "Technology Stack",
    promptCreator: insightsPrompts.createTechnologiesPrompt,
    schema: insightsSchemas.technologiesSchema,
  },
} as const; 