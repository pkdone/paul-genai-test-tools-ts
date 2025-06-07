import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { MongoDBClientFactory } from "../../utils/mongodb-client-factory";
import databaseConfig from "../../config/database.config";
import type { EnvVars } from "../../types/env.types";

/**
 * Register MongoDB-related dependencies.
 * This function should only be called once per application lifetime to maintain singleton behavior.
 */
export async function registerMongoDBDependencies(envVars: EnvVars): Promise<void> {
  console.log('Registering MongoDB dependencies (singleton initialization)...');  
  
  // Create MongoDB client factory singleton
  const mongoDBClientFactory = new MongoDBClientFactory();
  container.registerInstance(TOKENS.MongoDBClientFactory, mongoDBClientFactory);
  console.log('MongoDB Client Factory initialized and registered as singleton');
  
  // Create and register MongoDB client connection
  const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, 
                                                         envVars.MONGODB_URL );
  container.registerInstance(TOKENS.MongoClient, mongoClient);
  console.log('MongoDB Client connected and registered as singleton');
} 