import { MongoClient, Db, Collection, IndexSpecification } from "mongodb";
import { getErrorStack } from "../utils/error-utils";
import appConst from "../env/app-consts"
    

/**
 * Class for initializing the MongoDB database.
 */
class DBInitializer {
  /**
   * Constructor.
   */
  constructor(private readonly mongoClient: MongoClient, 
              private readonly databaseName: string,
              private readonly sourceCollectionName: string,
              private readonly appSummariesCollectionName: string,
              private readonly numDimensions: number | undefined = appConst.DEFAULT_VECTOR_DIMENSIONS_AMOUNT) { 
    this.mongoClient = mongoClient;
    this.sourceCollectionName = sourceCollectionName;
    this.appSummariesCollectionName = appSummariesCollectionName;
  }

  /**
   * Ensure require indexes exist, creating them if not
   */ 
  async ensureRequiredIndexes() {
    const db = this.mongoClient.db(this.databaseName);
    await this.generateNormalIndexes(db);
    await this.generateSearchIndexes(db);    
  }

  /**
   * Create normal MongoDB collection indexes if they don't yet exist.
   */
  private async generateNormalIndexes(db: Db) {
    const sourcesColctn = db.collection(this.sourceCollectionName);    
    await this.createNormalIndexIfNotExists(db, sourcesColctn, { projectName: 1, type: 1, "summary.classpath": 1 });
    const appSummariesColctn = db.collection(this.appSummariesCollectionName);
    await this.createNormalIndexIfNotExists(db, appSummariesColctn, { projectName: 1 });
  }

  /**
   * Create normal MongoDB collection indexes if they don't yet exist.
   */
  private async createNormalIndexIfNotExists(db: Db, colctn: Collection, indexSpec: IndexSpecification, isUnique = false) {
    await colctn.createIndex(indexSpec, { unique: isUnique });
    console.log(`Ensured normal indexes exist for the MongoDB database collection: '${db.databaseName}.${colctn.collectionName}'`);
  }

  /**
   * Create Atlas Vector Search indexes if they don't yet exist.
   */
  private async generateSearchIndexes(db: Db) {
    let unknownErrorOccurred = false;
    const sourcesColctn = db.collection(this.sourceCollectionName);    
    const vectorSearchIndexes = [
      {
        name:"contentVectorIndex",
        type:"vectorSearch",
        definition: {
          "fields": [
            {
              "type": "vector",
              "path": "contentVector",
              "numDimensions": this.numDimensions,
              "similarity": appConst.DEFAULT_VECTOR_SIMILARITY_TYPE,
              "quantization": appConst.DEFAULT_VECTOR_QUANTIZATION_TYPE,
            },
            {
              "type": "filter",
              "path": "projectName"
            },
            {
              "type": "filter",
              "path": "type"
            }
          ]
        },
      },
      {
        name:"summaryVectorIndex",
        type:"vectorSearch",
        definition: {
          "fields": [
            {
              "type": "vector",
              "path": "summaryVector",
              "numDimensions": this.numDimensions,
              "similarity": appConst.DEFAULT_VECTOR_SIMILARITY_TYPE,
              "quantization": appConst.DEFAULT_VECTOR_QUANTIZATION_TYPE,
            },
            {
              "type": "filter",
              "path": "projectName"
            },
            {
              "type": "filter",
              "path": "type"
            }
          ]
        },
      },
    ]

    try {
      await sourcesColctn.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      const isDuplicateIndexError = typeof error === "object" && error !== null && "codeName" in error && (error as { codeName: string }).codeName === "IndexAlreadyExists";

      if (!isDuplicateIndexError) {
        console.error(`Issue when creating Vector Search indexes, therefore you must create these Vector Search indexes manully (see README) for the MongoDB database collection: '${db.databaseName}.${sourcesColctn.collectionName}'`,
          error, getErrorStack(error));    
        unknownErrorOccurred = true;
      }
    }

    if (!unknownErrorOccurred) {
      console.log(`Ensured Vector Search indexes exist for the MongoDB database collection: '${db.databaseName}.${sourcesColctn.collectionName}'`);
    } 
  }
}

export default DBInitializer;
