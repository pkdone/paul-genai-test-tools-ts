import { Db } from "mongodb";
import appConst from "./env/app-consts";
import mongoDBService from "./utils/mongodb-service";
import { getProjectNameFromPath } from "./utils/fs-utils";
import { bootstrap } from "./env/bootstrap";

/**
 * Main function to run the program.
 */
async function main() {
  try {
    console.log(`START: ${new Date().toISOString()}`);
    const { env, mongoClient } = await bootstrap();   
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    const db = mongoClient.db(appConst.CODEBASE_DB_NAME);
    const collName = appConst.SOURCES_COLLCTN_NAME;  
    const result = await collectJavaFilePaths(db, collName, projectName);
    console.log("Result:", JSON.stringify(result, null, 2));
    console.log(`END: ${new Date().toISOString()}`);
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

// Interface for the project document
interface ProjectDoc {
  projectName: string,
  filepath: string,
}  

// Bootstrap
main().catch(console.error);
