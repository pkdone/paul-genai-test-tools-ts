import databaseConfig from "../config/database.config";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { getLLMProvider } from "../llm/llm-service";
import dotenv from "dotenv";
import { envVarsSchema, EnvVars } from "../types/env-types";

/**
 * Utility function to load environment variables and validate them.
 * 
 * Boolean flags in .env are standardized to accept both unquoted booleans (true/false)
 * and quoted strings ("true"/"false"), with case-insensitive parsing for improved robustness.
 * The Zod schema handles transformation to actual boolean values.
 */
export function loadEnvVars(): EnvVars {
  dotenv.config();
  return envVarsSchema.parse(process.env);
}

/**
 * Function to bootstrap the initiated MongoDB client + the LLM router with the specified model 
 * family and configuration based in  environment variable (also returning the list of environemnt 
 * variables for wider use.
 */
export async function bootstrap() {
  const { env, llmRouter } = await bootstrapJustLLM();
  const mongoClient = await mongoDBService.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter };
}

/**
 * Function to bootstrap the LLM router with the specified model family and configuration based in 
 * environment variable (also returning the list of environemnt variables for wider use.
 */
export async function bootstrapJustLLM() {
  const env = loadEnvVars();
  const llmProvider = await getLLMProvider(env);
  const llmRouter = new LLMRouter(llmProvider);
  return { env, llmRouter };
}