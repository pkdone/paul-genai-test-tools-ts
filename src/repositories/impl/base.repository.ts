import { inject } from "tsyringe";
import { MongoClient, Collection, Document } from "mongodb";
import { TOKENS } from "../../di/tokens";
import { databaseConfig } from "../../config";

/**
 * Abstract base repository class providing common MongoDB functionality
 */
export abstract class BaseRepository<T extends Document> {
  // Protected field accessible by subclasses
  protected readonly collection: Collection<T>;

  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.MongoClient) mongoClient: MongoClient, collectionName: string) {
    const db = mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<T>(collectionName);
  }
} 