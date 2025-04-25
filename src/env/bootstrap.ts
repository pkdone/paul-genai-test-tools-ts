import appConst from "../env/app-consts";
import mongoDBService from "../utils/mongodb-service";
import LLMRouter from "../llm/llm-router";
import { loadEnvVars } from "../env/env-vars";

export async function bootstrap() {
  const { env, llmRouter } = bootstrapJustLLM();
  const mongoClient = await mongoDBService.connect(appConst.DEFAULT_MONGO_SVC, env.MONGODB_URL);
  return { env, mongoClient, llmRouter };
}

export function bootstrapJustLLM() {
  const env = loadEnvVars();
  const llmRouter = new LLMRouter(env.LLM);
  return { env, llmRouter };
}