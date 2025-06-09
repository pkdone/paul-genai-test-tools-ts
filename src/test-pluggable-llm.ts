import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.PluggableLLMsTestService, { requiresMongoDB: false, requiresLLM: true })
  .catch(console.error);
