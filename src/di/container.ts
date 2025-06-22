import "reflect-metadata";
import { container } from "tsyringe";
import { ServiceRunnerConfig } from "../types/service.types";
import { EnvVars } from "../types/env.types";
import { TOKENS } from "./tokens";
import { registerEnvDependencies, registerLLMDependencies, registerMongoDBDependencies, 
         registerServices, registerMongoDBServices, registerComponents, registerRepositories } 
       from "./registration-modules";

/**
 * Bootstrap the DI container based on service configuration.
 * Leverages tsyringe's built-in singleton management and isRegistered checks.
 */
export async function bootstrapContainer(config: ServiceRunnerConfig): Promise<void> {
  await registerEnvDependencies(config.requiresLLM);  
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);
  if (config.requiresLLM) await registerLLMDependencies(envVars);

  if (config.requiresMongoDB) {
    await registerMongoDBDependencies(envVars);
    registerRepositories();
    registerMongoDBServices();
  }

  registerComponents();
  registerServices(); 
}

export { container }; 