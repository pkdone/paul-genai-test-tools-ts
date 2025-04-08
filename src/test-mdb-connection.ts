import { Db } from "mongodb";
import appConst from "./env/app-consts";
import mongoDBService from "./utils/mongodb-service";
import { loadEnvVars } from "./env/env-vars";

// Interface for the project document
interface ProjectDoc {
  projectName: string,
  filepath: string,
}  

/**
 * Main function to run the program.
 */
async function main() {
  try {
    const env = loadEnvVars();
    const mdbURL = env.MONGODB_URL; 
    const prjName = "dummy"; 
    const mongoClient = await mongoDBService.connect("default", mdbURL);
    const db = mongoClient.db(appConst.CODEBASE_DB_NAME);
    const collName = appConst.SOURCES_COLLCTN_NAME;  
    const result = await collectJavaFilePaths(db, collName, prjName);
    console.log("Result:", result);
  } finally {
    await mongoDBService.closeAll();
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

// Bootstrap
main().catch(console.error);
