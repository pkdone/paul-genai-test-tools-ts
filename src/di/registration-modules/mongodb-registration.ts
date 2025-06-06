import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { MongoDBClientFactory } from "../../utils/mongodb-client-factory";
import databaseConfig from "../../config/database.config";
import type { EnvVars } from "../../types/env.types";

/**
 * Register MongoDB-related dependencies.
 */
export async function registerMongoDBDependencies(envVars: EnvVars): Promise<void> {
  console.log('Registering MongoDB dependencies...');  
  const mongoDBClientFactory = new MongoDBClientFactory();
  container.registerInstance(TOKENS.MongoDBClientFactory, mongoDBClientFactory);  
  const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, 
                                                         envVars.MONGODB_URL );
  container.registerInstance(TOKENS.MongoClient, mongoClient);
} 