import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.CodeQueryService)
  .catch(console.error);
