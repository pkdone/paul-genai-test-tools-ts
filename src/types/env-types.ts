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

/**
 * Type guard for OpenAI environment variables
 */
export function isOpenAIEnv(env: EnvVars): env is EnvVars & { OPENAI_LLM_API_KEY: string } {
  return env.LLM === ModelFamily.OPENAI_MODELS && !!env.OPENAI_LLM_API_KEY;
}

/**
 * Type guard for Azure OpenAI environment variables
 */
export function isAzureEnv(env: EnvVars): env is EnvVars & {
  AZURE_LLM_API_KEY: string;
  AZURE_API_ENDPOINT: string;
  AZURE_API_EMBEDDINGS_MODEL: string;
  AZURE_API_COMPLETIONS_MODEL_PRIMARY: string;
  AZURE_API_COMPLETIONS_MODEL_SECONDARY: string;
} {
  return env.LLM === ModelFamily.AZURE_OPENAI_MODELS &&
    !!env.AZURE_LLM_API_KEY &&
    !!env.AZURE_API_ENDPOINT &&
    !!env.AZURE_API_EMBEDDINGS_MODEL &&
    !!env.AZURE_API_COMPLETIONS_MODEL_PRIMARY &&
    !!env.AZURE_API_COMPLETIONS_MODEL_SECONDARY;
}

/**
 * Type guard for VertexAI environment variables
 */
export function isVertexEnv(env: EnvVars): env is EnvVars & {
  GCP_API_PROJECTID: string;
  GCP_API_LOCATION: string;
} {
  return env.LLM === ModelFamily.VERTEXAI_GEMINI_MODELS &&
    !!env.GCP_API_PROJECTID &&
    !!env.GCP_API_LOCATION;
}

/**
 * Type guard for Bedrock environment variables
 */
export function isBedrockEnv(env: EnvVars): env is EnvVars {
  return [
    ModelFamily.BEDROCK_TITAN_MODELS,
    ModelFamily.BEDROCK_CLAUDE_MODELS,
    ModelFamily.BEDROCK_LLAMA_MODELS,
    ModelFamily.BEDROCK_MISTRAL_MODELS,
    ModelFamily.BEDROCK_NOVA_MODELS,
    ModelFamily.BEDROCK_DEEPSEEK_MODELS
  ].includes(env.LLM);
}