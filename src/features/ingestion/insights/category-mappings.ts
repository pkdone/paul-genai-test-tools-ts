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
    promptCreator: (codeContent: string) => insightsPrompts.createInsightsPrompt('appDescription', codeContent),
    schema: insightsSchemas.appDescriptionSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    promptCreator: (codeContent: string) => insightsPrompts.createInsightsPrompt('boundedContexts', codeContent),
    schema: insightsSchemas.boundedContextsSchema,
  },
  businessEntities: {
    label: "Business Entities",
    promptCreator: (codeContent: string) => insightsPrompts.createInsightsPrompt('businessEntities', codeContent),
    schema: insightsSchemas.businessEntitiesSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    promptCreator: (codeContent: string) => insightsPrompts.createInsightsPrompt('businessProcesses', codeContent),
    schema: insightsSchemas.businessProcessesSchema,
  },
  technologies: {
    label: "Technology Stack",
    promptCreator: (codeContent: string) => insightsPrompts.createInsightsPrompt('technologies', codeContent),
    schema: insightsSchemas.technologiesSchema,
  },
} as const; 