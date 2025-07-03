import { z } from "zod";
import {
  appDescriptionKeyValPairSchema,
  boundedContextsKeyValPairSchema,
  businessEntitiesKeyValPairSchema,
  businessProcessesKeyValPairSchema,
  technologiesKeyValPairSchema,
} from "../../schemas/app-summaries.schema";

export const AppSummaryCategoryEnum = z.enum([
  "appDescription",
  "boundedContexts",
  "businessEntities",
  "businessProcesses",
  "technologies",
]);
export type AppSummaryCategory = z.infer<typeof AppSummaryCategoryEnum>;

export const appSummaryCategoryConfig: Record<
  AppSummaryCategory,
  {
    label: string;
    promptDetails: string;
    schema: z.ZodType;
  }
> = {
  appDescription: {
    label: "Application Description",
    promptDetails: "the detailed description of the application's purpose and implementation.",
    schema: appDescriptionKeyValPairSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    promptDetails: "a concise list of the bounded contexts from a Domain Driven Design perspective.",
    schema: boundedContextsKeyValPairSchema,
  },
  businessEntities: {
    label: "Business Entities",
    promptDetails: "a concise list of the application's main business entities.",
    schema: businessEntitiesKeyValPairSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    promptDetails: "a concise list of the application's main business processes.",
    schema: businessProcessesKeyValPairSchema,
  },
  technologies: {
    label: "Technologies",
    promptDetails: "a concise list of key external and host platform technologies depended on by the application.",
    schema: technologiesKeyValPairSchema,
  },
};
