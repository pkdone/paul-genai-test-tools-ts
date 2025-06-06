import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.CodebaseCaptureService, { requiresMongoDB: true, requiresLLM: true })
  .catch(console.error);
