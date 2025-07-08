import { z } from "zod";
import {
  appDescriptionKeyValPairSchema,
  AppSummaryCategoryEnum,
  boundedContextsKeyValPairSchema,
  businessEntitiesKeyValPairSchema,
  businessProcessesKeyValPairSchema,
  technologiesKeyValPairSchema,
} from "../schemas/app-summary-categories.schema";

export type SummaryCategory = z.infer<typeof AppSummaryCategoryEnum>;

export const summaryCategoriesConfig: Record<
  SummaryCategory,
  {
    label: string;
    description: string;
    schema: z.ZodType;
  }
> = {
  appDescription: {
    label: "Application Description",
    description: "the detailed description of the application's purpose and implementation.",
    schema: appDescriptionKeyValPairSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    description: "a concise list of the bounded contexts from a Domain Driven Design perspective.",
    schema: boundedContextsKeyValPairSchema,
  },
  businessEntities: {
    label: "Business Entities",
    description: "a concise list of the application's main business entities.",
    schema: businessEntitiesKeyValPairSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    description: "a concise list of the application's main business processes.",
    schema: businessProcessesKeyValPairSchema,
  },
  technologies: {
    label: "Technologies",
    description:
      "a concise list of key external and host platform technologies depended on by the application.",
    schema: technologiesKeyValPairSchema,
  },
};
