import databaseConfig from "../config/database.config";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { getLLMProvider, getLLMProviderManifest } from "../llm/llm-service";
import dotenv from "dotenv";
import { z } from "zod";
import { baseEnvVarsSchema, EnvVars } from "../types/env.types";

/**
 * Utility function to load environment variables and validate them.
 */
export async function loadEnvVars(): Promise<EnvVars> {
  dotenv.config();
  const LlmSelectorSchema = z.object({ LLM: z.string().optional() }); // Make LLM optional here for initial parse
  const rawEnv = process.env;
  const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
  if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) throw new Error("LLM environment variable is not set or is empty.");
  const selectedLlm = selectedLlmContainer.data.LLM;
  console.log(`Selected LLM: ${selectedLlm}`); // TODO: remove this
  const manifest = await getLLMProviderManifest(selectedLlm);
  if (!manifest) throw new Error(`No provider manifest schema found for LLM: ${selectedLlm}.`);
  const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();
  const parsedEnv = finalSchema.parse(rawEnv) as Record<string, unknown>;
  return parsedEnv as EnvVars; // Cast to EnvVars; Zod's inference provides the actual shape
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
  const env = await loadEnvVars();
  const llmProvider = await getLLMProvider(env);
  const llmRouter = new LLMRouter(llmProvider);
  return { env, llmRouter };
}