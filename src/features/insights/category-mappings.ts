import { z } from "zod";
import {
  appDescriptionSchema,
  boundedContextsSchema,
  businessEntitiesSchema,
  businessProcessesSchema,
  technologiesSchema,
} from "../../schemas/app-summaries.schema";
import * as insightsPrompts from "./insights.prompts";

// Type-safe category definitions
// TODO: should this be in schemas/appSummary.schema.ts?
export type AppSummaryCategory =
  | "appDescription"
  | "boundedContexts"
  | "businessEntities"
  | "businessProcesses"
  | "technologies";

// Declarative mapping for prompts, schemas, and labels
export const categoryPromptSchemaMappings: Record<
  AppSummaryCategory,
  {
    label: string;
    promptCreator: (codeContent: string) => string;
    schema: z.ZodType;
  }
> = {
  appDescription: {
    label: "Application Description",
    promptCreator: (codeContent: string) =>
      insightsPrompts.createInsightsPrompt("appDescription", codeContent),
    schema: appDescriptionSchema,
  },
  // TODO: use constant
  boundedContexts: {
    label: "Bounded Contexts",
    promptCreator: (codeContent: string) =>
                                           // TODO: use constant
      insightsPrompts.createInsightsPrompt("boundedContexts", codeContent),
    schema: boundedContextsSchema,
  },
  businessEntities: {
    label: "Business Entities",
    promptCreator: (codeContent: string) =>
      insightsPrompts.createInsightsPrompt("businessEntities", codeContent),
    schema: businessEntitiesSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    promptCreator: (codeContent: string) =>
      insightsPrompts.createInsightsPrompt("businessProcesses", codeContent),
    schema: businessProcessesSchema,
  },
  technologies: {
    label: "Technology Stack",
    promptCreator: (codeContent: string) =>
      insightsPrompts.createInsightsPrompt("technologies", codeContent),
    schema: technologiesSchema,
  },
} as const;
