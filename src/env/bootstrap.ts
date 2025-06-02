import databaseConfig from "../config/database.config";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { getLLMProvider } from "../llm/llm-service";
import dotenv from "dotenv";
import { z } from "zod";
import { baseEnvVarsSchema } from "../types/env.types";
import { loadEnvIncludingLLMVars } from "../utils/llm-env-utils";

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
  const env = await loadEnvIncludingLLMVars(); // This now uses the dynamic schema loading
  const llmProvider = await getLLMProvider(env); // getLLMProvider uses env.LLM to find the provider
  const llmRouter = new LLMRouter(llmProvider);
  return { env, llmRouter };
}