import "reflect-metadata";
import { runService } from "./lifecycle/service-runner";
import { TOKENS } from "./di/tokens";

runService(TOKENS.MongoDBConnectionTestService, { requiresMongoDB: true, requiresLLM: false })
  .catch(console.error);
