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
 * Bootstrap base environment variables only.
 */
export function bootstrapBaseEnv() {
  const env = loadBaseEnvVarsOnly();
  return { env };
}

/**
 * Bootstrap base environment variables and LLM router.
 */
export async function bootstrapWithLLM() {
  const llmService = new LLMService();
  await llmService.initialize();
  const env = loadEnvIncludingLLMVars(llmService); 
  const llmProvider = llmService.getLLMProvider(env);
  const llmManifest = llmService.getLLMManifest(env.LLM);
  const retryConfig = llmManifest?.providerSpecificConfig;
  const llmRouter = new LLMRouter(llmProvider, retryConfig);
  return { env, llmRouter, llmService };
}

/**
 * Bootstrap base environment variables, LLM router, and MongoDB client.
 */
export async function bootstrapWithLLMAndMongoDB() {  
  const { env, llmRouter, llmService } = await bootstrapWithLLM();
  const mongoDBClientFactory = new MongoDBClientFactory();
  const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter, mongoDBClientFactory, llmService };
}

/**
 * Bootstrap MongoDB client only (with base environment variables).
 */
export async function bootstrapWithMongoDB() {
  const { env } = bootstrapBaseEnv();
  const { mongoClient, mongoDBClientFactory } = await getMongoDBClientFactory(env);
  return { env, mongoClient, mongoDBClientFactory };
}

/**
 * 
 * @param env 
 * @returns 
 */
async function getMongoDBClientFactory(env: { MONGODB_URL: string; CODEBASE_DIR_PATH: string; IGNORE_ALREADY_PROCESSED_FILES: boolean; LLM: string; }) {
  const mongoDBClientFactory = new MongoDBClientFactory();
  const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { mongoClient, mongoDBClientFactory };
}

