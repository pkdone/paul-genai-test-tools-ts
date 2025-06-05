import { MongoClient } from 'mongodb';
import LLMRouter from '../llm/llm-router';
import { EnvVars } from './env.types';

/**
 * Base interface that all services must implement.
 */
export interface Service {
  /**
   * Execute the main functionality of the service.
   */
  execute(): Promise<void>;
}

/**
 * Configuration for the service runner.
 */
export interface ServiceRunnerConfig {
  /** Whether this service requires MongoDB client */
  requiresMongoDB: boolean;
  /** Whether this service requires LLM router */
  requiresLLM: boolean;
}

/**
 * Dependencies that can be injected into services.
 */
export interface ServiceDependencies {
  mongoClient?: MongoClient;
  llmRouter?: LLMRouter;
  env: EnvVars;
}

/**
 * Factory function type for creating service instances.
 */
export type ServiceFactory<T extends Service> = (dependencies: ServiceDependencies) => T; 