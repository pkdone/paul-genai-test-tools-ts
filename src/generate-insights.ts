import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.InsightGenerationService, { requiresMongoDB: true, requiresLLM: true })
  .catch(console.error);
