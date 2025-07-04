import { z } from "zod";

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
 * Schema for application description
 */
export const appDescriptionSchema = z
  .string()
  .describe(
    "A detailed description of the application's purpose and implementation in at least 20 sentences).",
  );
export const appDescriptionKeyValPairSchema = z.object({
  appDescription: appDescriptionSchema,
});

/**
 * Schema for arrays of bounded contexts name-description pairs
 */
export const boundedContextsArraySchema = z
  .array(nameDescSchema)
  .describe("A list of bounded contexts from a Domain Driven Design perspective");
export const boundedContextsKeyValPairSchema = z.object({
  boundedContexts: boundedContextsArraySchema,
});

/**
 * Schema for arrays of business entities name-description pairs
 */
export const businessEntitiesArraySchema = z
  .array(nameDescSchema)
  .describe("A list of the application's main business entities.");
export const businessEntitiesKeyValPairSchema = z.object({
  businessEntities: businessEntitiesArraySchema,
});

/**
 * Schema for arrays of business processes name-description pairs
 */
export const businessProcessesArraySchema = z
  .array(nameDescSchema)
  .describe("A list of the application's main business processes.");
export const businessProcessesKeyValPairSchema = z.object({
  businessProcesses: businessProcessesArraySchema,
});

// Schema for `generate-technologies.prompt`
export const technologiesArraySchema = z
  .array(nameDescSchema)
  .describe(
    "A list of key external and host platform technologies depended on by the application.",
  );
export const technologiesKeyValPairSchema = z.object({
  technologies: technologiesArraySchema,
});
