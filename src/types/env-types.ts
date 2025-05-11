import { ModelFamily } from "./llm-models-metadata";
import { z } from "zod";

/**
 * Zod schema for environment variables
 */
export const envVarsSchema = z.object({
  MONGODB_URL: z.string().url(),
  LLM: z.nativeEnum(ModelFamily),
  CODEBASE_DIR_PATH: z.string(),
  IGNORE_ALREADY_PROCESSED_FILES: z.enum(["true", "false"]).optional().default("false").transform((val) => val === "true"),
  OPENAI_LLM_API_KEY: z.string(),
  AZURE_LLM_API_KEY: z.string(),
  AZURE_API_ENDPOINT: z.string(),
  AZURE_API_EMBEDDINGS_MODEL: z.string(),
  AZURE_API_COMPLETIONS_MODEL_PRIMARY: z.string(),
  AZURE_API_COMPLETIONS_MODEL_SECONDARY: z.string(),
  GCP_API_PROJECTID: z.string(),
  GCP_API_LOCATION: z.string(),
});

/**
 * Interface for application environment variables, inferred from Zod schema
 */
export type EnvVars = z.infer<typeof envVarsSchema>;