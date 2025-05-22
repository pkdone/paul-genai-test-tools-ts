import { MongoClient, Collection, Sort } from "mongodb";
import databaseConfig from "../config/database.config";
import reportingConfig from "../config/reporting.config";

// Interface for project insights
interface SummariesRecord {
  projectName: string;
  [reportingConfig.APP_DESCRIPTION_KEY]: string;
  technologies?: { name: string; description: string; }[];
  boundedcontexts?: { name: string; description: string; }[];
  busentities?: { name: string; description: string; }[];
  busprocesses?: { name: string; description: string; }[];
}

/**
 * Class to handle analysis data server operations.
 */
export default class InsightsDataServer {
  // Private fields
  private readonly colctn: Collection<SummariesRecord>;

  /**
   * Constructor.
   */
  constructor(readonly mongoClient: MongoClient, readonly databaseName: string, private readonly projectName: string) {
    this.colctn = mongoClient.db(databaseName).collection(databaseConfig.SUMMARIES_COLLCTN_NAME);
  }

  /**
   * Retrieves a list of business processes from the database.
   */
  async getBusinessProcesses() {
    const query = {
      projectName: this.projectName,
    };
    const options = {
      projection: {
        _id: 0,
        "busprocesses": 1,
      },
      sort: { "busprocesses": 1 } as Sort,
    };
    const records = await this.colctn.find(query, options).toArray();
    return records.flatMap(record => record.busprocesses ?? []);
  }
}