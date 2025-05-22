import InsightsDataServer from "./insights-data-server";
import mongoDBService from "../utils/mongodb-service";
import databaseConfig from "../config/database.config";
import { loadEnvVars } from "../env/bootstrap";
import { getProjectNameFromPath } from "../utils/path-utils";

const env = loadEnvVars();
const srcDirPath = env.CODEBASE_DIR_PATH;
const projectName = getProjectNameFromPath(srcDirPath);     

describe("AnalysisDataServer", () => {
  it("should return an array of objects where each object has keys 'name' and 'description'", async () => {
    try {
      const mongoClient = await mongoDBService.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
      const analysisDataServer = new InsightsDataServer(mongoClient, databaseConfig.CODEBASE_DB_NAME, projectName); 
      const result = await analysisDataServer.getBusinessProcesses();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("description");
        expect(typeof item.name).toBe("string");
        expect(typeof item.description).toBe("string");
        expect(Object.keys(item)).toHaveLength(2);
      });
    } finally {
      await mongoDBService.closeAll();
    }
  });
});

