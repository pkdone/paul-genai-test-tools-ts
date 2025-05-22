import appConst from "../env/app-consts";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { getLLMProvider } from "../llm/llm-configurator/llm-provider-factory";
import dotenv from "dotenv";
import { envVarsSchema, EnvVars } from "../types/env-types";

/**
 * Utility function to load environment variables and validate them.
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
  const { env, llmRouter } = bootstrapJustLLM();
  const mongoClient = await mongoDBService.connect(appConst.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter };
}

/**
 * Function to bootstrap the LLM router with the specified model family and configuration based in 
 * environment variable (also returning the list of environemnt variables for wider use.
 */
export function bootstrapJustLLM() {
  const env = loadEnvVars();
  const llm = getLLMProvider(env);
  const llmRouter = new LLMRouter(llm);  
  return { env, llmRouter };
}