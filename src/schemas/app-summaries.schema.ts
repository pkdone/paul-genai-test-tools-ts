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
 * Zod schema for application summary categories
 * This is used to validate the category names in app summaries
 */
export const AppSummaryCategoryEnum = z.enum([
  "appDescription",
  "boundedContexts",
  "businessEntities",
  "businessProcesses",
  "technologies",
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
 * Schema for arrays of bounded contexts name-description pairs
 */
export const boundedContextsKeyValPairSchema = z.object({
  boundedContexts: z
    .array(nameDescSchema)
    .describe("A list of bounded contexts from a Domain Driven Design perspective"),
});

/**
 * Schema for arrays of business entities name-description pairs
 */
export const businessEntitiesKeyValPairSchema = z.object({
  businessEntities: z
    .array(nameDescSchema)
    .describe("A list of the application's main business entities."),
});

/**
 * Schema for arrays of business processes name-description pairs
 */
export const businessProcessesKeyValPairSchema = z.object({
  businessProcesses: z
    .array(nameDescSchema)
    .describe("A list of the application's main business processes."),
});

// Schema for `generate-technologies.prompt`
export const technologiesKeyValPairSchema = z.object({
  technologies: z
    .array(nameDescSchema)
    .describe(
      "A list of key external and host platform technologies depended on by the application.",
    ),
});
