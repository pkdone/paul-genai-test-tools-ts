import AnalysisDataServer from "./analysis-data-server";
import mongoDBService from "../utils/mongodb-service";
import appConst from "../env/app-consts";
import { loadEnvVars } from "../env/env-vars";
import { getProjectNameFromPath } from "../utils/fs-utils";
const env = loadEnvVars();
const srcDirPath = env.CODEBASE_DIR_PATH;
const projectName = getProjectNameFromPath(srcDirPath);     


describe("AnalysisDataServer", () => {
  it("should return a comma-separated string of collection names", async () => {
    try {
      const mongoClient = await mongoDBService.connect(appConst.DEFAULT_MONGO_SVC, env.MONGODB_URL);
      const analysisDataServer = new AnalysisDataServer(mongoClient, appConst.CODEBASE_DB_NAME, projectName); 
      const result = await analysisDataServer.getBusinessProcesses();
      expect(result).toBe("Order Management, Catalog Management, Customer Account Management");
    } finally {
      await mongoDBService.closeAll();
    }
  })
});

