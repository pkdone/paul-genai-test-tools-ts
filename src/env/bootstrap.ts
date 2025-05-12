import appConst from "../env/app-consts";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { loadEnvVars } from "../env/env-vars";
import { initializeLLMImplementation } from "../llm/llm-configurator/llm-initializer";

/**
 * Function to bootstrap the application by loading environment variables,
 */
export async function bootstrap() {
  const { env, llmRouter } = bootstrapJustLLM();
  const mongoClient = await mongoDBService.connect(appConst.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter };
}

/**
 * Function to bootstrap the LLM router with the specified model family and configuration.
 */
export function bootstrapJustLLM() {
  const env = loadEnvVars();
  const llmImpl = initializeLLMImplementation(env);
  const llmRouter = new LLMRouter(llmImpl);  
  return { env, llmRouter };
}