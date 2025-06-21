import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { MongoClient, Collection, IndexSpecification } from "mongodb";
import { TOKENS } from "../di/tokens";
import { databaseConfig, llmConfig } from "../config";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { createVectorSearchIndexDefinition } from "../mdb/mdb-utils";
import { Service } from "../types/service.types";

/**
 * Service responsible for database schema initialization and management.
 * Handles all DDL operations including index creation for both collections.
 */
@injectable()
export class DBInitializerService implements Service {
  private readonly sourcesCollection: Collection;
  private readonly appSummariesCollection: Collection;

  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient) {
    const db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.sourcesCollection = db.collection(databaseConfig.SOURCES_COLLCTN_NAME);
    this.appSummariesCollection = db.collection(databaseConfig.SUMMARIES_COLLCTN_NAME);
  }

  /**
   * Execute the service - initializes database schema.
   */
  async execute(): Promise<void> {
    const numDimensions = llmConfig.DEFAULT_VECTOR_DIMENSIONS_AMOUNT;
    await this.ensureAllIndexes(numDimensions);
  }

  /**
   * Ensure all required indexes exist for both collections.
   */
  async ensureAllIndexes(numDimensions: number): Promise<void> {
    await this.ensureSourcesIndexes(numDimensions);
    await this.ensureAppSummariesIndexes();
  }

  /**
   * Ensure required indexes exist for the sources collection.
   */
  private async ensureSourcesIndexes(numDimensions: number): Promise<void> {
    await this.createSourcesNormalIndexes();
    await this.createSourcesVectorSearchIndexes(numDimensions);
  }

  /**
   * Ensure required indexes exist for the app summaries collection.
   */
  private async ensureAppSummariesIndexes(): Promise<void> {
    await this.createNormalIndexIfNotExists(
      this.appSummariesCollection,
      { projectName: 1 }
    );
  }

  /**
   * Create normal MongoDB collection indexes for sources collection.
   */
  private async createSourcesNormalIndexes(): Promise<void> {
    await this.createNormalIndexIfNotExists(
      this.sourcesCollection,
      { projectName: 1, type: 1, "summary.classpath": 1 }
    );
  }

  /**
   * Create Atlas Vector Search indexes for sources collection.
   */
  private async createSourcesVectorSearchIndexes(numDimensions: number): Promise<void> {
    let unknownErrorOccurred = false;
    const vectorSearchIndexes = [];
    vectorSearchIndexes.push(this.createFileContentVectorIndexDefinition(databaseConfig.CONTENT_VECTOR_INDEX, numDimensions));
    vectorSearchIndexes.push(this.createFileContentVectorIndexDefinition(databaseConfig.SUMMARY_VECTOR_INDEX, numDimensions));

    try {
      await this.sourcesCollection.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      const isDuplicateIndexError = typeof error === "object" && error !== null && "codeName" in error && (error as { codeName: string }).codeName === "IndexAlreadyExists";

      if (!isDuplicateIndexError) {
        logErrorMsgAndDetail(
          `Issue when creating Vector Search indexes, therefore you must create these Vector Search indexes manually (see README) for the MongoDB database collection: '${this.sourcesCollection.dbName}.${this.sourcesCollection.collectionName}'`,
          error
        );    
        unknownErrorOccurred = true;
      }
    }

    if (!unknownErrorOccurred) {
      console.log(`Ensured Vector Search indexes exist for the MongoDB database collection: '${this.sourcesCollection.dbName}.${this.sourcesCollection.collectionName}'`);
    } 
  }

  /**
   * Create a normal MongoDB collection index if it doesn't exist.
   */
  private async createNormalIndexIfNotExists(collection: Collection, indexSpec: IndexSpecification, isUnique = false): Promise<void> {
    await collection.createIndex(indexSpec, { unique: isUnique });
    console.log(`Ensured normal indexes exist for the MongoDB database collection: '${collection.dbName}.${collection.collectionName}'`);
  }

  /**
   * Create a vector search index with a project and file type filter for a particular metadata 
   * field extracted from a file.
   */
  private createFileContentVectorIndexDefinition(fieldToIndex: string, numDimensions: number) {
    const indexName = fieldToIndex === databaseConfig.CONTENT_VECTOR_INDEX 
      ? databaseConfig.CONTENT_VECTOR_INDEX_NAME 
      : databaseConfig.SUMMARY_VECTOR_INDEX_NAME;
    
    const filters = [
      {
        type: "filter",
        path: "projectName"
      },
      {
        type: "filter",
        path: "type"
      }
    ];

    return createVectorSearchIndexDefinition(
      indexName,
      fieldToIndex,
      numDimensions,
      llmConfig.VECTOR_SIMILARITY_TYPE,
      llmConfig.VECTOR_QUANTIZATION_TYPE,
      filters
    );
  }
} 