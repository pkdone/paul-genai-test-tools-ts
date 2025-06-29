import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { MongoDBClientFactory } from "../../common/mdb/mdb-client-factory";
import { databaseConfig } from "../../repositories/database.config";
import type { EnvVars } from "../../app/env.types";

/**
 * Register MongoDB-related dependencies.
 * Uses tsyringe's isRegistered check to prevent duplicate registrations.
 */
export async function registerMongoDBDependencies(envVars: EnvVars): Promise<void> {
  if (!container.isRegistered(TOKENS.MongoDBClientFactory)) {
    container.registerSingleton(TOKENS.MongoDBClientFactory, MongoDBClientFactory);
    const mongoDBClientFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
    console.log('MongoDB Client Factory initialized and registered as singleton');
    const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, 
                                                           envVars.MONGODB_URL );
    container.registerInstance(TOKENS.MongoClient, mongoClient);
    console.log('MongoDB Client connected and registered as singleton');
  } else {
    console.log('MongoDB dependencies already registered - skipping registration');
  }
} 