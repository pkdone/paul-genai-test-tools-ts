import databaseConfig from "../config/database.config";
import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import LLMRouter from "../llm/llm-router";
import { LLMService } from "../llm/llm-service";
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
  const { env, llmRouter, llmService } = await bootstrapJustLLM()
  const mongoDBClientFactory = new MongoDBClientFactory();
  const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter, mongoDBClientFactory, llmService };
}

/**
 * Function to bootstrap the LLM router with the specified model family and configuration based in
 * environment variable (also returning the list of environemnt variables for wider use).
 */
export async function bootstrapJustLLM() {
  // Create and initialize LLMService instance
  const llmService = new LLMService();
  await llmService.initialize();
  
  const env = loadEnvIncludingLLMVars(llmService); // Pass LLMService instance
  const llmProvider = llmService.getLLMProvider(env); // Use instance method
  const llmRouter = new LLMRouter(llmProvider);
  return { env, llmRouter, llmService };
}
