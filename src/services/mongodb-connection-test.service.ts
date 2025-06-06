import { MongoClient, Db } from "mongodb";
import databaseConfig from "../config/database.config";
import { getProjectNameFromPath } from "../utils/path-utils";
import { Service } from "../types/service.types";
import { EnvVars } from "../types/env.types";

/**
 * Service to test the MongoDB connection.
 */
export class MongoDBConnectionTestService implements Service {
  /**
   * Constructor.
   */  
  constructor(private readonly mongoClient: MongoClient, private readonly env: EnvVars) {}

  /**
   * Execute the service - tests the MongoDB connection.
   */
  async execute(): Promise<void> {
    await this.testConnection(this.env.CODEBASE_DIR_PATH);
  }

  private async testConnection(srcDirPath: string): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    const db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    const collName = databaseConfig.SOURCES_COLLCTN_NAME;  
    const result = await this.collectJavaFilePaths(db, collName, projectName);
    console.log("Result:", JSON.stringify(result, null, 2));
  }

  /**
   * Collects the file paths of Java files from a MongoDB collection based on the given project name.
   */
  private async collectJavaFilePaths(db: Db, collName: string, prjName: string): Promise<string[]> {
    const coll = db.collection<ProjectDoc>(collName);  
    return await coll.find({ projectName: prjName }, { projection: { filepath: 1 } })
               .map(doc => doc.filepath)
               .toArray();
  }
}

// Interface for the project document
interface ProjectDoc {
  projectName: string;
  filepath: string;
} 