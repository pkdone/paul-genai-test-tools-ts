import { z } from "zod";

/**
 * Schema for name-description pairs used for insights
 */
export const nameDescSchema = z
  .object({
    name: z.string().describe("The name of the entity."),
    description: z
      .string()
      .describe("A detailed description of the entity in at least 5 sentences."),
  })
  .passthrough();

/**
 * Schema for business activities/steps within a business process
 */
export const businessActivitySchema = z
  .object({
    activity: z.string().describe("The name of the business activity step."),
    description: z
      .string()
      .describe("A detailed description of the business activity step using business language."),
  })
  .passthrough();

/**
 * Schema for business processes with key activities
 */
export const businessProcessSchema = z
  .object({
    name: z.string().describe("The name of the business process."),
    description: z
      .string()
      .describe("A detailed description of the business process in at least 5 sentences."),
    keyBusinessActivities: z
      .array(businessActivitySchema)
      .describe(
        "An array of key business activity steps that are linearly conducted by this process.",
      ),
  })
  .passthrough();

/**
 * Zod schema for application summary categories
 * This is used to validate the category names in app summaries
 */
export const AppSummaryCategoryEnum = z.enum([
  "appDescription",
  "technologies",
  "businessProcesses",
  "boundedContexts",
  "aggregates",
  "entities",
  "repositories",
  "potentialMicroservices",
]);

/**
 * Schema for application description
 */
export const appDescriptionKeyValPairSchema = z.object({
  appDescription: z
    .string()
    .describe(
      "A detailed description of the application's purpose and implementation in at least 20 sentences).",
    ),
});

/**
 * / Schema for `generate-technologies.prompt`
 */
export const technologiesKeyValPairSchema = z.object({
  technologies: z
    .array(nameDescSchema)
    .describe(
      "A list of key external and host platform technologies depended on by the application.",
    ),
});

/**
 * Schema for arrays of business processes name-description pairs
 */
export const businessProcessesKeyValPairSchema = z.object({
  businessProcesses: z
    .array(businessProcessSchema)
    .describe(
      "A list of the application's main business processes with their key business activities.",
    ),
});

/**
 * Schema for arrays of bounded contexts name-description pairs
 */
export const boundedContextsKeyValPairSchema = z.object({
  boundedContexts: z
    .array(nameDescSchema)
    .describe(
      "A list of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models.",
    ),
});

/**
 * Schema for arrays of aggregates name-description pairs
 */
export const aggregatesKeyValPairSchema = z.object({
  aggregates: z
    .array(nameDescSchema)
    .describe(
      "A list of Domain-Driven Design aggregates that enforce business rules and maintain consistency.",
    ),
});

/**
 * Schema for arrays of entities name-description pairs
 */
export const entitiesKeyValPairSchema = z.object({
  entities: z
    .array(nameDescSchema)
    .describe(
      "A list of Domain-Driven Design entities that represent core business concepts and contain business logic.",
    ),
});

/**
 * Schema for arrays of repositories name-description pairs
 */
export const repositoriesKeyValPairSchema = z.object({
  repositories: z
    .array(nameDescSchema)
    .describe(
      "A list of Domain-Driven Design repositories that provide access to aggregate persistence.",
    ),
});

/**
 * Schema for arrays of potential microservices name-description pairs
 */
export const potentialMicroservicesKeyValPairSchema = z.object({
  potentialMicroservices: z
    .array(nameDescSchema)
    .describe(
      "A list of recommended microservices to modernize the monolithic application, each following the Single Responsibility Principle with defined CRUD operations and REST API endpoints.",
    ),
});
