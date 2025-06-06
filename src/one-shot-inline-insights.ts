import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.InlineInsightsService, { requiresMongoDB: false, requiresLLM: true })
  .catch(console.error);
