import appConst from "../env/app-consts";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { loadEnvVars } from "../env/env-vars";

export async function bootstrap() {
  const env = loadEnvVars();
  const mongoClient = await mongoDBService.connect(appConst.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  const llmRouter = new LLMRouter(env.LLM);
  return { env, mongoClient, llmRouter };
}

export function bootstrapJustLLM() {
  const env = loadEnvVars();
  return new LLMRouter(env.LLM);
}