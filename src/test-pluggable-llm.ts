import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.LLMTestService,{ requiresMongoDB: false, requiresLLM: true })
  .catch(console.error);
