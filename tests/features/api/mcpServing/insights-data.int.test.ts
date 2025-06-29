import "reflect-metadata";
import InsightsDataServer from "../../../../src/features/api/mcpServing/insights-data-server";
import { databaseConfig } from "../../../../src/config/database.config";
import { loadBaseEnvVarsOnly } from "../../../../src/lifecycle/env";
import { getProjectNameFromPath } from "../../../../src/common/utils/path-utils";
import { MongoDBClientFactory } from "../../../../src/common/mdb/mdb-client-factory";
import AppSummariesRepositoryImpl from "../../../../src/repositories/app-summary/app-summaries.repository";

describe("AnalysisDataServer", () => {
  it("should return an array of objects where each object has keys 'name' and 'description'", async () => {
    const mongoDBClientFactory = new MongoDBClientFactory();
    
    try {
      const env = loadBaseEnvVarsOnly();
      const srcDirPath = env.CODEBASE_DIR_PATH;
      const projectName = getProjectNameFromPath(srcDirPath);     
      const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, env.MONGODB_URL);
      const appSummariesRepository = new AppSummariesRepositoryImpl(mongoClient);
      const analysisDataServer = new InsightsDataServer(appSummariesRepository, projectName); 
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
      await mongoDBClientFactory.closeAll();
    }
  });
});

