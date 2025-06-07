import { MongoClient, Db, Collection, IndexSpecification } from "mongodb";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { createVectorSearchIndexDefinition } from "../mdb/mdb-utils";
import llmConfig from "../config/llm.config";
import databaseConfig from "../config/database.config";

/**
 * Class for initializing the MongoDB database.
 */
class DBInitializer {
  // Private members
  private readonly db: Db;

  /**
   * Constructor.
   */
  constructor(private readonly mongoClient: MongoClient, 
              private readonly databaseName: string,
              private readonly sourceCollectionName: string,
              private readonly appSummariesCollectionName: string,
              private readonly numDimensions: number = llmConfig.DEFAULT_VECTOR_DIMENSIONS_AMOUNT) { 
    this.mongoClient = mongoClient;
    this.sourceCollectionName = sourceCollectionName;
    this.appSummariesCollectionName = appSummariesCollectionName;
    this.db = this.mongoClient.db(this.databaseName);
  }

  /**
   * Ensure require indexes exist, creating them if not
   */ 
  async ensureRequiredIndexes(): Promise<void> {
    await this.generateNormalIndexes();
    await this.generateSearchIndexes();    
  }

  /**
   * Create normal MongoDB collection indexes if they don't yet exist.
   */
  private async generateNormalIndexes() {
    const sourcesColctn = this.db.collection(this.sourceCollectionName);    
    await this.createNormalIndexIfNotExists(sourcesColctn, { projectName: 1, type: 1, "summary.classpath": 1 });
    const appSummariesColctn = this.db.collection(this.appSummariesCollectionName);
    await this.createNormalIndexIfNotExists(appSummariesColctn, { projectName: 1 });
  }

  /**
   * Create normal MongoDB collection indexes if they don't yet exist.
   */
  private async createNormalIndexIfNotExists(colctn: Collection, indexSpec: IndexSpecification, isUnique = false) {
    await colctn.createIndex(indexSpec, { unique: isUnique });
    console.log(`Ensured normal indexes exist for the MongoDB database collection: '${this.db.databaseName}.${colctn.collectionName}'`);
  }

  /**
   * Create Atlas Vector Search indexes if they don't yet exist.
   */
  private async generateSearchIndexes() {
    let unknownErrorOccurred = false;
    const sourcesColctn = this.db.collection(this.sourceCollectionName);    
    const vectorSearchIndexes = [];
    vectorSearchIndexes.push(this.createFileContentVectorIndexDefiniton(databaseConfig.CONTENT_VECTOR_INDEX));
    vectorSearchIndexes.push(this.createFileContentVectorIndexDefiniton(databaseConfig.SUMMARY_VECTOR_INDEX));

    try {
      await sourcesColctn.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      const isDuplicateIndexError = typeof error === "object" && error !== null && "codeName" in error && (error as { codeName: string }).codeName === "IndexAlreadyExists";

      if (!isDuplicateIndexError) {
        logErrorMsgAndDetail(
          `Issue when creating Vector Search indexes, therefore you must create these Vector Search indexes manully (see README) for the MongoDB database collection: '${this.db.databaseName}.${sourcesColctn.collectionName}'`,
          error
        );    
        unknownErrorOccurred = true;
      }
    }

    if (!unknownErrorOccurred) {
      console.log(`Ensured Vector Search indexes exist for the MongoDB database collection: '${this.db.databaseName}.${sourcesColctn.collectionName}'`);
    } 
  }

  /**
   * Create a vector search index woth a prokect and file type filter for a particular metadata 
   * field exxtracted from a file.
   */
  private createFileContentVectorIndexDefiniton(fieldToIndex: string) {
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
      this.numDimensions,
      llmConfig.VECTOR_SIMILARITY_TYPE,
      llmConfig.VECTOR_QUANTIZATION_TYPE,
      filters
    );
  }
}

export default DBInitializer;
