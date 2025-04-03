import { Db } from "mongodb";
import appConst from "./types/app-constants";
import { getEnvVar } from "./utils/envvar-utils";
import mongoDBService from "./utils/mongodb-service";
import envConst from "./types/env-constants";

/**
 * Main function to run the program.
 */
async function main() {
  try {
    const mdbURL = getEnvVar<string>(envConst.ENV_MONGODB_URL); 
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
  interface ProjectDoc {
    projectName: string,
    filepath: string,
  }  
  const coll = db.collection<ProjectDoc>(collName);  
  return await coll.find({ projectName: prjName }, { projection: { filepath: 1 } })
             .map(doc => doc.filepath)
             .toArray();
}

// Bootstrap
main().catch(console.error);
