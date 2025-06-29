import { z } from "zod";
import { nameDescSchema } from "../../schemas/common.schemas";

// Schema for `generate-appdescription.prompt`
export const appDescriptionSchema = z.object({
  appDescription: z
    .string()
    .describe(
      "A detailed description of the application's purpose and implementation (max 25 sentences).",
    ),
});
export type AppDescription = z.infer<typeof appDescriptionSchema>;

// Schema for `generate-boundedcontexts.prompt`
export const boundedContextsSchema = z.object({
  boundedContexts: z
    .array(
      nameDescSchema.extend({
        name: z.string().describe("The name of the item."),
        description: z.string().describe("A concise description (max 3 sentences)."),
      }),
    )
    .describe("A list of bounded contexts from a Domain Driven Design perspective."),
});
export type BoundedContexts = z.infer<typeof boundedContextsSchema>;

// Schema for `generate-busentities.prompt`
export const businessEntitiesSchema = z.object({
  businessEntities: z
    .array(
      nameDescSchema.extend({
        name: z.string().describe("The name of the item."),
        description: z.string().describe("A concise description (max 3 sentences)."),
      }),
    )
    .describe("A list of the application's main business entities."),
});
export type BusinessEntities = z.infer<typeof businessEntitiesSchema>;

// Schema for `generate-busprocesses.prompt`
export const businessProcessesSchema = z.object({
  businessProcesses: z
    .array(
      nameDescSchema.extend({
        name: z.string().describe("The name of the item."),
        description: z.string().describe("A concise description (max 3 sentences)."),
      }),
    )
    .describe("A list of the application's main business processes."),
});
export type BusinessProcesses = z.infer<typeof businessProcessesSchema>;

// Schema for `generate-technologies.prompt`
export const technologiesSchema = z.object({
  technologies: z
    .array(
      nameDescSchema.extend({
        name: z.string().describe("The name of the item."),
        description: z.string().describe("A concise description (max 3 sentences)."),
      }),
    )
    .describe(
      "A list of key external and host platform technologies depended on by the application.",
    ),
});
export type Technologies = z.infer<typeof technologiesSchema>;
