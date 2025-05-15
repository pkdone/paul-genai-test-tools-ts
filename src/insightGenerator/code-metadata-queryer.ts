import { MongoClient, Collection, Sort } from "mongodb";
import appConst from "../env/app-consts";

// Enum for stored procedure complexity levels
enum Complexity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

// Interface for stored procedures and triggers
interface StoredProcedureOrTrigger {
  name: string;
  purpose: string;
  complexity: Complexity; 
  linesOfCode: number;
}

// Interface for source file record
interface SourceFileRecord {
  summary?: {
    classpath?: string;
    purpose?: string;
    implementation?: string;
    databaseIntegration?: {
      mechanism: string;
      description: string;
    };
    storedProcedures?: StoredProcedureOrTrigger[];
    triggers?: StoredProcedureOrTrigger[];
  };
  filepath: string;
}

// Interface for the database interaction list
export interface ProcsAndTriggers {
  procs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: {
      path: string;
      type: string;
      functionName: string;
      complexity: Complexity;
      linesOfCode: number;
      purpose: string;
    }[];
  };
  trigs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: {
      path: string;
      type: string;
      functionName: string;
      complexity: Complexity;
      linesOfCode: number;
      purpose: string;
    }[];
  };
}

/**
 * Class responsible for querying code metadata from the database.
 */
export class CodeMetadataQueryer {
  // Private field for the Mongo Collection
  private readonly colctn: Collection<SourceFileRecord>;

  /**
   * Constructor
   */
  constructor(
    readonly mongoClient: MongoClient,
    readonly databaseName: string,
    readonly sourceCollectionName: string,
    private readonly projectName: string
  ) {
    const db = mongoClient.db(databaseName);
    this.colctn = db.collection<SourceFileRecord>(sourceCollectionName);
  }

  /**
   * Returns a list of source file summaries with basic info.
   */
  async buildSourceFileListSummaryList() {
    const srcFilesList: string[] = [];
    const query = {
      projectName: this.projectName,
      type: { $in: appConst.SOURCE_FILES_FOR_CODE },
    };
    const options = {
      projection: {
        _id: 0,
        "summary.classpath": 1,
        "summary.purpose": 1,
        "summary.implementation": 1,
        filepath: 1,
      },
      sort: { "summary.classpath": 1 } as Sort,
    };
    const records = await this.colctn.find(query, options).toArray();

    for (const record of records) {
      const { summary } = record;

      if (!summary || Object.keys(summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = summary.classpath ?? record.filepath;
      srcFilesList.push(`* ${fileLabel}: ${summary.purpose ?? ""} ${summary.implementation ?? ""}`);
    }
    
    return srcFilesList;
  }

  /**
   * Returns a list of database integrations.
   */
  async buildDBInteractionList() {
    const dbIntegrationsList: {
      path: string;
      mechanism: string;
      description: string;
    }[] = [];
    const query = {
      projectName: this.projectName,
      type: { $in: appConst.SOURCE_FILES_FOR_CODE },
      "summary.databaseIntegration.mechanism": { $ne: "NONE" },
    };
    const options = {
      projection: {
        _id: 0,
        "summary.classpath": 1,
        "summary.databaseIntegration.mechanism": 1,
        "summary.databaseIntegration.description": 1,
        filepath: 1,
      },
      sort: {
        "summary.databaseIntegration.mechanism": 1,
        "summary.classpath": 1,
      } as Sort,
    };
    const records = await this.colctn.find(query, options).toArray();

    for (const record of records) {
      const { summary } = record;

      if (!summary?.databaseIntegration) {
        console.log(`No DB interaction summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      dbIntegrationsList.push({
        path: summary.classpath ?? record.filepath,
        mechanism: summary.databaseIntegration.mechanism,
        description: summary.databaseIntegration.description,
      });
    }

    return dbIntegrationsList;
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers.
   */
  async buildDBStoredProcsTriggersSummaryList() {
    const procsAndTriggers: ProcsAndTriggers = {
      procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
    };
    const query = {
      $and: [
        { projectName: this.projectName },
        { type: { $in: appConst.SOURCE_FILES_FOR_CODE } },
        {
          $or: [
            { "summary.storedProcedures": { $exists: true, $ne: [] } },
            { "summary.triggers": { $exists: true, $ne: [] } },
          ],
        },
      ],
    };
    const options = {
      projection: { _id: 0, summary: 1, filepath: 1 },
    };
    const records = await this.colctn.find(query, options).toArray();

    for (const record of records) {
      const { summary } = record;
      
      if (!summary) {
        console.log(`No stored procs / triggers summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      // Process stored procedures
      for (const sp of summary.storedProcedures ?? []) {
        procsAndTriggers.procs.total++;
        this.incrementComplexityCount(procsAndTriggers.procs, sp.complexity);
        procsAndTriggers.procs.list.push({
          path: record.filepath,
          type: "STORED PROCEDURE",
          functionName: sp.name,
          complexity: sp.complexity,
          linesOfCode: sp.linesOfCode,
          purpose: sp.purpose,
        });
      }

      // Process triggers
      for (const trig of summary.triggers ?? []) {
        procsAndTriggers.trigs.total++;
        this.incrementComplexityCount(procsAndTriggers.trigs, trig.complexity);
        procsAndTriggers.trigs.list.push({
          path: record.filepath,
          type: "TRIGGER",
          functionName: trig.name,
          complexity: trig.complexity,
          linesOfCode: trig.linesOfCode,
          purpose: trig.purpose,
        });
      }
    }

    return procsAndTriggers;
  }

  /**
   * Increment the complexity count on a procs/trigs section.
   */
  private incrementComplexityCount(
    section: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    complexity: Complexity
  ) {
    switch (complexity) {
      case Complexity.LOW:
        section.low++;
        break;
      case Complexity.MEDIUM:
        section.medium++;
        break;
      case Complexity.HIGH:
        section.high++;
        break;
    }
  }
}

export default CodeMetadataQueryer;
