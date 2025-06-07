import "reflect-metadata";
import { container } from "tsyringe";
import { ServiceRunnerConfig } from "../types/service.types";
import { EnvVars } from "../types/env.types";
import { TOKENS } from "./tokens";
import { registerEnvDependencies, registerLLMDependencies, registerMongoDBDependencies, 
         registerServices } from "./registration-modules";

/**
 * Register dependencies based on service configuration.
 * Leverages tsyringe's built-in singleton management and isRegistered checks.
 */
export async function registerDependencies(config: ServiceRunnerConfig): Promise<void> {
  console.log(`Registering dependencies for service with config:`, config);
  await registerEnvDependencies(config.requiresLLM);  
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);
  if (config.requiresLLM) await registerLLMDependencies(envVars);
  if (config.requiresMongoDB) await registerMongoDBDependencies(envVars);
  registerServices();  
  console.log('Dependency registration completed');
}

export { container }; 