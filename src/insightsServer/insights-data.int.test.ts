import InsightsDataServer from "./insights-data-server";
import mongoDBService from "../utils/mongodb-service";
import appConst from "../env/app-consts";
import { loadEnvVars } from "../env/env-vars";
import { getProjectNameFromPath } from "../utils/fs-utils";
const env = loadEnvVars();
const srcDirPath = env.CODEBASE_DIR_PATH;
const projectName = getProjectNameFromPath(srcDirPath);     

describe("AnalysisDataServer", () => {
  it("should return an array of objects where each object has keys 'name' and 'description'", async () => {
    try {
      const mongoClient = await mongoDBService.connect(appConst.DEFAULT_MONGO_SVC, env.MONGODB_URL);
      const analysisDataServer = new InsightsDataServer(mongoClient, appConst.CODEBASE_DB_NAME, projectName); 
      const result = await analysisDataServer.getBusinessProcesses();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("description");
        expect(typeof item?.name).toBe("string");
        expect(typeof item?.description).toBe("string");
        if (item) expect(Object.keys(item)).toHaveLength(2);
      });
    } finally {
      await mongoDBService.closeAll();
    }
  })
});

