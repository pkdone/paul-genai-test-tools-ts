import { ModelFamily } from "./llm-models-types";
import { z } from "zod";

// Base schema for common environment variables
const baseEnvVarsSchema = z.object({
  MONGODB_URL: z.string().url(),
  CODEBASE_DIR_PATH: z.string(),
  IGNORE_ALREADY_PROCESSED_FILES: z
    .union([
      z.enum(["true", "false"]), // Handle strings "true"/"false" (with quotes in .env)
      z.boolean(),               // Handle native boolean true/false (without quotes in .env)
      z.literal("TRUE").transform(() => "true"),      // Handle case variations
      z.literal("FALSE").transform(() => "false"),    // Handle case variations
    ])
    .optional()
    .default("false")
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val === "true";
    }),
  // LLM provider selection
  LLM: z.nativeEnum(ModelFamily),
  // All possible LLM provider environment variables (optional)
  OPENAI_LLM_API_KEY: z.string().optional(),
  AZURE_LLM_API_KEY: z.string().optional(),
  AZURE_API_ENDPOINT: z.string().optional(),
  AZURE_API_EMBEDDINGS_MODEL: z.string().optional(),
  AZURE_API_COMPLETIONS_MODEL_PRIMARY: z.string().optional(),
  AZURE_API_COMPLETIONS_MODEL_SECONDARY: z.string().optional(),
  GCP_API_PROJECTID: z.string().optional(),
  GCP_API_LOCATION: z.string().optional(),
});

/**
 * Zod schema for environment variables using the new generic approach
 */
export const envVarsSchema = baseEnvVarsSchema;

/**
 * Interface for application environment variables, inferred from Zod schema
 */
export type EnvVars = z.infer<typeof envVarsSchema>;
