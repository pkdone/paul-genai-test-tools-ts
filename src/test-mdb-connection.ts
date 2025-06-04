import { Db } from "mongodb";
import databaseConfig from "./config/database.config";
import { getProjectNameFromPath } from "./utils/path-utils";
import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";

/**
 * Main function to run the program.
 */
async function main() {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  
  try {
    const { env, mongoClient, mongoDBClientFactory: factory } = await bootstrapStartup();   
    mongoDBClientFactory = factory;
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    const db = mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    const collName = databaseConfig.SOURCES_COLLCTN_NAME;  
    const result = await collectJavaFilePaths(db, collName, projectName);
    console.log("Result:", JSON.stringify(result, null, 2));
  } finally {
    await gracefulShutdown(undefined, mongoDBClientFactory);
  }
}

/**
 * Collects the file paths of Java files from a MongoDB collection based on the given project name.
 */
async function collectJavaFilePaths(db: Db, collName: string, prjName: string) {
  const coll = db.collection<ProjectDoc>(collName);  
  return await coll.find({ projectName: prjName }, { projection: { filepath: 1 } })
             .map(doc => doc.filepath)
             .toArray();
}

// Interface for the project document
interface ProjectDoc {
  projectName: string;
  filepath: string;
}  

// Bootstrap
main().catch(console.error);
