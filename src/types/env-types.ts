import { ModelFamily } from "./llm-models-metadata";
import { z } from "zod";

// Base schema for common environment variables
const baseEnvVarsSchema = z.object({
  MONGODB_URL: z.string().url(),
  CODEBASE_DIR_PATH: z.string(),
  IGNORE_ALREADY_PROCESSED_FILES: z.enum(["true", "false"]).optional().default("false").transform((val) => val === "true"),
});

// Provider-specific schemas
const openAIEnvVarsSchema = baseEnvVarsSchema.extend({
  LLM: z.literal(ModelFamily.OPENAI_MODELS),
  OPENAI_LLM_API_KEY: z.string(),
});

const azureEnvVarsSchema = baseEnvVarsSchema.extend({
  LLM: z.literal(ModelFamily.AZURE_OPENAI_MODELS),
  AZURE_LLM_API_KEY: z.string(),
  AZURE_API_ENDPOINT: z.string(),
  AZURE_API_EMBEDDINGS_MODEL: z.string(),
  AZURE_API_COMPLETIONS_MODEL_PRIMARY: z.string(),
  AZURE_API_COMPLETIONS_MODEL_SECONDARY: z.string(),
});

const vertexEnvVarsSchema = baseEnvVarsSchema.extend({
  LLM: z.literal(ModelFamily.VERTEXAI_GEMINI_MODELS),
  GCP_API_PROJECTID: z.string(),
  GCP_API_LOCATION: z.string(),
});

const bedrockEnvVarsSchema = baseEnvVarsSchema.extend({
  LLM: z.enum([
    ModelFamily.BEDROCK_TITAN_MODELS,
    ModelFamily.BEDROCK_CLAUDE_MODELS,
    ModelFamily.BEDROCK_LLAMA_MODELS,
    ModelFamily.BEDROCK_MISTRAL_MODELS,
    ModelFamily.BEDROCK_NOVA_MODELS,
    ModelFamily.BEDROCK_DEEPSEEK_MODELS
  ]),
});

/**
 * Zod schema for environment variables using discriminated union
 */
export const envVarsSchema = z.discriminatedUnion("LLM", [
  openAIEnvVarsSchema,
  azureEnvVarsSchema,
  vertexEnvVarsSchema,
  bedrockEnvVarsSchema,
]);

/**
 * Interface for application environment variables, inferred from Zod schema
 */
export type EnvVars = z.infer<typeof envVarsSchema>;

/**
 * Type guard for OpenAI environment variables
 */
export function isOpenAIEnv(env: EnvVars): env is z.infer<typeof openAIEnvVarsSchema> {
  return env.LLM === ModelFamily.OPENAI_MODELS;
}

/**
 * Type guard for Azure OpenAI environment variables
 */
export function isAzureEnv(env: EnvVars): env is z.infer<typeof azureEnvVarsSchema> {
  return env.LLM === ModelFamily.AZURE_OPENAI_MODELS;
}

/**
 * Type guard for VertexAI environment variables
 */
export function isVertexEnv(env: EnvVars): env is z.infer<typeof vertexEnvVarsSchema> {
  return env.LLM === ModelFamily.VERTEXAI_GEMINI_MODELS;
}

/**
 * Type guard for Bedrock environment variables
 */
export function isBedrockEnv(env: EnvVars): env is z.infer<typeof bedrockEnvVarsSchema> {
  return [
    ModelFamily.BEDROCK_TITAN_MODELS,
    ModelFamily.BEDROCK_CLAUDE_MODELS,
    ModelFamily.BEDROCK_LLAMA_MODELS,
    ModelFamily.BEDROCK_MISTRAL_MODELS,
    ModelFamily.BEDROCK_NOVA_MODELS,
    ModelFamily.BEDROCK_DEEPSEEK_MODELS
  ].includes(env.LLM);
}