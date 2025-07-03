import { z } from "zod";
import {
  appDescriptionKeyValPairSchema,
  boundedContextsKeyValPairSchema,
  businessEntitiesKeyValPairSchema,
  businessProcessesKeyValPairSchema,
  technologiesKeyValPairSchema,
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
  // TODO: use constant
  appDescription: {
    label: "Application Description",
    promptCreator: (codeContent: string) =>
      // TODO: use constant
      insightsPrompts.createInsightsPrompt("appDescription", codeContent),
    schema: appDescriptionKeyValPairSchema,
  },
  // TODO: use constant
  boundedContexts: {
    label: "Bounded Contexts",
    promptCreator: (codeContent: string) =>
      // TODO: use constant
      insightsPrompts.createInsightsPrompt("boundedContexts", codeContent),
    schema: boundedContextsKeyValPairSchema,
  },
  // TODO: use constant
  businessEntities: {
    label: "Business Entities",
    promptCreator: (codeContent: string) =>
      // TODO: use constant
      insightsPrompts.createInsightsPrompt("businessEntities", codeContent),
    schema: businessEntitiesKeyValPairSchema,
  },
  // TODO: use constant
  businessProcesses: {
    label: "Business Processes",
    promptCreator: (codeContent: string) =>
      // TODO: use constant
      insightsPrompts.createInsightsPrompt("businessProcesses", codeContent),
    schema: businessProcessesKeyValPairSchema,
  },
  // TODO: use constant
  technologies: {
    label: "Technology Stack",
    promptCreator: (codeContent: string) =>
      // TODO: use constant
      insightsPrompts.createInsightsPrompt("technologies", codeContent),
    schema: technologiesKeyValPairSchema,
  },
} as const;
