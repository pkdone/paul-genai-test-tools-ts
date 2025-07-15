import { z } from "zod";
import {
  appDescriptionKeyValPairSchema,
  AppSummaryCategoryEnum,
  boundedContextsKeyValPairSchema,
  entitiesKeyValPairSchema,
  businessProcessesKeyValPairSchema,
  technologiesKeyValPairSchema,
  aggregatesKeyValPairSchema,
  repositoriesKeyValPairSchema,
  potentialMicroservicesKeyValPairSchema,
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
  technologies: {
    label: "Technologies",
    description:
      "a concise list of key external and host platform technologies depended on by the application.",
    schema: technologiesKeyValPairSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    description: "a concise list of the application's main business processes.",
    schema: businessProcessesKeyValPairSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    description: "a concise list of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models.",
    schema: boundedContextsKeyValPairSchema,
  },
  aggregates: {
    label: "Aggregates",
    description: "a concise list of Domain Driven Design aggregates that enforce business rules and maintain consistency.",
    schema: aggregatesKeyValPairSchema,
  },
  entities: {
    label: "Entities",
    description: "a concise list of Domain-Driven Design entities that represent core business concepts and contain business logic.",
    schema: entitiesKeyValPairSchema,
  },
  repositories: {
    label: "Repositories", 
    description: "a concise list of Domain Driven Design repositories that provide access to aggregate persistence.",
    schema: repositoriesKeyValPairSchema,
  },
  potentialMicroservices: {
    label: "Potential Microservices",
    description: "a concise list of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with defined CRUD operations and REST API endpoints.",
    schema: potentialMicroservicesKeyValPairSchema,
  },
};
