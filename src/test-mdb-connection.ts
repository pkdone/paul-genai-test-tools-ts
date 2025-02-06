import { Collection, Document } from "mongodb";
import appConst from "./types/app-constants";
import { getEnvVar } from "./utils/envvar-utils";
import mongoDBService from "./utils/mongodb-service";


/**
 * Main function to run the program.
 */
async function main(): Promise<void> {
  const mdbURL = getEnvVar<string>("MONGODB_URL"); 
  const prjName = getEnvVar<string>("PROJECT_NAME"); 
  await mongoDBService.connect(mdbURL);

  const result = await mongoDBService.using(async () => {
    const mongoClient = mongoDBService.getClient();
    const db = mongoClient.db(appConst.CODEBASE_DB_NAME);
    const coll = db.collection(appConst.SRC_COLLCTN_NAME);  
    return await collectJavaFilePaths(coll, prjName);
  });

  console.log("Result:", result);
}


/**
 * Collects the file paths of Java files from a MongoDB collection based on the given project name.
 */
async function collectJavaFilePaths(coll: Collection<Document>, prjName: string): Promise<string[]> {
  return coll.find({ projectName: prjName }, { projection: { filepath: 1 } })
             .map(doc => doc.filepath)
             .toArray();
}


// Bootstrap
(async () => {
  await main();
})();
