import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.InlineInsightsService)
  .catch(console.error);
