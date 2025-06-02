import databaseConfig from "../config/database.config";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { getLLMProvider, getLLMProviderManifest } from "../llm/llm-service";
import dotenv from "dotenv";
import { z } from "zod";
import { baseEnvVarsSchema, EnvVars } from "../types/env.types";

/**
 * Utility function to load only base environment variables and validate them.
 */
export function loadBaseEnvVarsOnly(): z.infer<typeof baseEnvVarsSchema> {
  dotenv.config();
  const rawEnv = process.env;
  const parsedEnv = baseEnvVarsSchema.parse(rawEnv);
  return parsedEnv;
}

/**
 * Utility function to load environment variables and validate them.
 * This function dynamically incorporates the Zod schema for environment variables specific to the
 * selected LLM provider.
 */
export async function loadEnvVars(): Promise<EnvVars> {
  dotenv.config();
  // Schema to initially parse only the LLM selection variable
  const LlmSelectorSchema = z.object({ LLM: z.string().optional() });
  const rawEnv = process.env;

  // Initial parse to get the selected LLM provider name
  const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
  if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) throw new Error("LLM environment variable is not set or is empty in your .env file.");
  const selectedLlmModelFamily = selectedLlmContainer.data.LLM;

  // Load the manifest for the selected provider - getLLMProviderManifest will internally ensure
  // the llm-service is initialized
  const manifest = await getLLMProviderManifest(selectedLlmModelFamily);
  if (!manifest) throw new Error("No provider manifest found for LLM: '${selectedLlmModelFamily}");
  
  // Merge base schema with provider-specific schema from the manifest - the manifest.envSchema
  // defines variables specific to that LLM provider.
  const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();

  // Parse all environment variables with the combined schema
  const parsedEnv = finalSchema.parse(rawEnv);

  // Consistency check (LLM from .env vs modelFamily from manifest)
  if (parsedEnv.LLM !== manifest.modelFamily) {
      throw new Error(
        `Warning: LLM environment variable ('${parsedEnv.LLM}') does not precisely match ` +
        `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `
      );
  }

  return parsedEnv as EnvVars; // Zod's inference on finalSchema provides the actual shape
}

/**
 * Function to bootstrap the initiated MongoDB client + the LLM router with the specified model
 * family and configuration based in  environment variable (also returning the list of environemnt
 * variables for wider use).
 */
export async function bootstrap() {
  const { env, llmRouter } = await bootstrapJustLLM()
  const mongoClient = await mongoDBService.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter };
}

/**
 * Function to bootstrap the LLM router with the specified model family and configuration based in
 * environment variable (also returning the list of environemnt variables for wider use).
 */
export async function bootstrapJustLLM() {
  const env = await loadEnvVars(); // This now uses the dynamic schema loading
  const llmProvider = await getLLMProvider(env); // getLLMProvider uses env.LLM to find the provider
  const llmRouter = new LLMRouter(llmProvider);
  return { env, llmRouter };
}