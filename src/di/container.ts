import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { ServiceRunnerConfig } from "../types/service.types";
import { EnvVars } from "../types/env.types";
import { registerEnvDependencies, registerLLMDependencies, registerMongoDBDependencies, 
         registerServices } from "./registration-modules";

/**
 * Interface for tracking registered dependency groups
 */
interface RegistrationState {
  envDependencies: Set<string>; // Track different env configurations by hash
  llmDependencies: boolean;
  mongoDBDependencies: boolean;
  services: boolean;
}

/**
 * DI Container service for managing dependency registration and resolution.
 */
export class DIContainer {
  private static instance: DIContainer | undefined;
  private registrationState: RegistrationState = {
    envDependencies: new Set(),
    llmDependencies: false,
    mongoDBDependencies: false,
    services: false
  };
  
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
   * Ensures singleton lifetime by tracking registration state.
   */
  async registerDependencies(config: ServiceRunnerConfig): Promise<void> {
    console.log(`Registering dependencies for service with config:`, config);
    
    // Create a hash for the env configuration to handle different LLM requirements
    const envConfigHash = this.createEnvConfigHash(config.requiresLLM);
    
    // Register environment dependencies only if not already registered for this configuration
    if (!this.registrationState.envDependencies.has(envConfigHash)) {
      await registerEnvDependencies(config.requiresLLM);
      this.registrationState.envDependencies.add(envConfigHash);
    } else {
      console.log(`Environment dependencies already registered for configuration: ${envConfigHash} - skipping registration`);
    }
    
    const envVars = this.resolve(TOKENS.EnvVars) as EnvVars;
    
    // Register LLM dependencies only once if required
    if (config.requiresLLM && !this.registrationState.llmDependencies) {
      await registerLLMDependencies(envVars);
      this.registrationState.llmDependencies = true;
    } else if (config.requiresLLM) {
      console.log('LLM dependencies already registered as singletons - skipping registration');
    }
    
    // Register MongoDB dependencies only once if required
    if (config.requiresMongoDB && !this.registrationState.mongoDBDependencies) {
      await registerMongoDBDependencies(envVars);
      this.registrationState.mongoDBDependencies = true;
    } else if (config.requiresMongoDB) {
      console.log('MongoDB dependencies already registered as singletons - skipping registration');
    }
    
    // Register services only once
    if (!this.registrationState.services) {
      registerServices();
      this.registrationState.services = true;
    } else {
      console.log('Application services already registered as singletons - skipping registration');
    }
    
    console.log('Dependency registration completed - all singletons maintained');
  }
  
  /**
   * Resolve a dependency from the container.
   */
  resolve(token: symbol): unknown {
    return container.resolve(token);
  }
  
  /**
   * Check if a specific dependency group is registered
   */
  isRegistered(dependencyType: keyof RegistrationState, configHash?: string): boolean {
    if (dependencyType === 'envDependencies' && configHash) {
      return this.registrationState.envDependencies.has(configHash);
    }
    return this.registrationState[dependencyType] as boolean;
  }
  
  /**
   * Reset registration state (useful for testing)
   */
  resetRegistrationState(): void {
    this.registrationState = {
      envDependencies: new Set(),
      llmDependencies: false,
      mongoDBDependencies: false,
      services: false
    };
  }
  
  /**
   * Create a hash for environment configuration to track different requirements
   */
  private createEnvConfigHash(requiresLLM: boolean): string {
    return `llm:${requiresLLM}`;
  }
}

/**
 * Export the singleton instance for easy access.
 */
export const diContainer = DIContainer.getInstance(); 