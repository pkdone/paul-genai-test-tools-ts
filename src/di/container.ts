import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { ServiceRunnerConfig } from "../types/service.types";
import { EnvVars } from "../types/env.types";
import { registerEnvDependencies, registerLLMDependencies, registerMongoDBDependencies, 
         registerServices } from "./registration-modules";

/**
 * DI Container service for managing dependency registration and resolution.
 */
export class DIContainer {
  private static instance: DIContainer | undefined;  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
  
  /**
   * Get the singleton instance of the DI container.
   */
  static getInstance(): DIContainer {
    DIContainer.instance ??= new DIContainer();
    return DIContainer.instance;
  }
  
  /**
   * Register dependencies based on service configuration.
   */
  async registerDependencies(config: ServiceRunnerConfig): Promise<void> {
    console.log(`Registering dependencies for service with config:`, config);
    await registerEnvDependencies(config.requiresLLM);
    const envVars = this.resolve(TOKENS.EnvVars) as EnvVars;    
    if (config.requiresLLM) await registerLLMDependencies(envVars);    
    if (config.requiresMongoDB) await registerMongoDBDependencies(envVars);
    registerServices();
  }
  
  /**
   * Resolve a dependency from the container.
   */
  resolve(token: symbol): unknown {
    return container.resolve(token);
  }
  
  /**
   * Clear all registered dependencies (useful for testing).
   */
  clearContainer(): void {
    container.clearInstances();
  }
}

/**
 * Export the singleton instance for easy access.
 */
export const diContainer = DIContainer.getInstance(); 