import { MongoClient, Collection, Sort } from "mongodb";
import appConst from "../env/app-consts";

// Interface for project insights
interface SummariesRecord {
  busprocesses?: {
    name: string;
    description: string;
   };
}

export default class AnalysisDataServer {
  // Private fields
  private readonly colctn: Collection<SummariesRecord>;

  /**
   * Constructor.
   */
  constructor(readonly mongoClient: MongoClient, readonly databaseName: string, private readonly projectName: string) {
    this.colctn = mongoClient.db(databaseName).collection(appConst.SUMMARIES_COLLCTN_NAME);
  }

  /**
   * Creates a new application summary record in the database.
   */
  async getBusinessProcesses() {
    const processes = await this.getBusinessProcessList();
    const processString = processes.map((process) => process?.name).join(", ");
    return processString;
  }

  /**
   * Retrieves a list of business processes from the database.
   */
  async getBusinessProcessList() {
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
    return records.flatMap(record => record.busprocesses);
  }
}