import appConst from "../types/app-constants";
import { MongoClient, Collection, Sort } from "mongodb";

/**
 * Type the complexity value procedures and triggers metadata.
 */
type Complexity = 'low' | 'medium' | 'high';

/**
 * Type for procedures and triggers metadata.
 */
interface ProcsAndTriggers {
  procs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: {
      path: string;
      type: string;
      "Function Name": string;
      complexity: Complexity;
      "Lines Of Code": number;
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
      "Function Name": string;
      complexity: Complexity;
      "Lines Of Code": number;
      purpose: string;
    }[];
  };
}

/**
 * Respoinsible for querying already captured resources metadata from the datavase.
 */
class CodeMetadataQueryer {
  // Private fields
  private readonly colctn: Collection;

  
  /**
   * Constructor.
   */
  constructor(mongoClient: MongoClient, databaseName: string, sourceCollectionName: string,
              private readonly projectName: string) {   
    const db = mongoClient.db(databaseName);
    this.colctn = db.collection(sourceCollectionName);   
  }


  /**
   * Query the metadata persistted for each source code file and capture as an array of the metdata.
   */
  async buildSourceFileListSummaryList() {
    // Assemble and execute the query
    const query = { 
      projectName: this.projectName,
      type: {"$in": appConst.SOURCE_FILES_FOR_CODE}
    };
    const options = {
      projection: { _id: 0, "summary.classpath": 1, "summary.purpose": 1, "summary.implementation": 1, "filepath": 1 },
      sort: { "summary.classpath": 1 } as Sort,
    };
    const records = this.colctn.find(query, options);

    // Define result processing type
    interface ProjectionType {
      summary: {        
        classpath: string;
        purpose: string;
        implementation: string;  
      }
      filepath: string;
    }
    const srcFilesList = [];

    // Loop through result records
    for await (const record of records as AsyncIterable<ProjectionType>) {      
      const summary = record.summary;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if ((!summary) || (Object.keys(summary).length === 0 && summary.constructor === Object)) {  // Summary may be null in database even though we've told TS compuler it should be there
        console.log(`No source code summary exsits for the following source file, so will be ignored: ${record.filepath}`);
        continue;
      } 

      const fileLabel = summary.classpath || record.filepath;
      srcFilesList.push(`* ${fileLabel}: ${summary.purpose} ${summary.implementation}`);  
    }

    return srcFilesList;
  }


  /**
   * Run an aggrgeation to assemble the list of DB stored prcoesdures and triggers.
   */
  async buildDBInteractionList() {
    // Assemble and execute the query
    const query = { 
      projectName: this.projectName, 
      type: {"$in": appConst.SOURCE_FILES_FOR_CODE},
      "summary.databaseIntegration.mechanism": {$ne: "NONE"},
    };
    const options = {
      projection: { _id: 0, "summary.classpath": 1, "summary.databaseIntegration.mechanism": 1, "summary.databaseIntegration.description": 1, "filepath": 1 },
      sort: { "summary.databaseIntegration.mechanism": 1, "summary.classpath": 1 } as Sort,
    };
    const records = this.colctn.find(query, options);

    // Define result processing type
    interface ProjectionType {
      summary: {
        classpath: string;
        databaseIntegration: {
          mechanism: string;
          description: string;          
        }
      }
      filepath: string;
    }    
    const dbIntegrationsList = [];

    // Loop through result records
    for await (const record of records as AsyncIterable<ProjectionType>) {      
      const summary = record.summary;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if ((!summary) || (Object.keys(summary).length === 0 && summary.constructor === Object)) {  // Summary may be null in database even though we've told TS compuler it should be there
        console.log(`No DB interaction summary exists for the following source file, so will be ignored: ${record.filepath}`);
        continue;
      }

      dbIntegrationsList.push({
        path: summary.classpath || record.filepath,
        mechanism: summary.databaseIntegration.mechanism,
        description: summary.databaseIntegration.description,
      });
    }
    return dbIntegrationsList;
  }  


  /**
   * Run an aggrgeation to assemble the list of DB interaction metadata elements.
   */
  async buildDBStoredProcsTriggersSummaryList() {
    // Assemble and execute the query
    const query = {
      "$and": [ 
        {projectName: this.projectName}, 
        {type: {"$in": appConst.SOURCE_FILES_FOR_CODE}},
        {"$or": [
          {"summary.storedProcedures": {"$exists": true, "$ne": []}},
          {"summary.triggers": {"$exists": true, "$ne": []}},
        ]}
      ]
    };
    const options = {
      projection: { _id: 0, summary: 1, filepath: 1 },
    };
    const records = this.colctn.find(query, options);

    // Define result processing type
    interface ProjectionProcTrigSubType {      
      name: string;
      purpose: string;
      complexity: Complexity;
      linesOfCode: number;
    }    
    interface ProjectionType {
      summary: {
        storedProcedures: [ProjectionProcTrigSubType];
        triggers: [ProjectionProcTrigSubType];
      }
      filepath: string;
    }    
    const procsAndTriggers: ProcsAndTriggers = {
      procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      trigs: { total: 0, low: 0, medium: 0, high: 0, list: []},
    };
    
    // Loop through result records
    for await (const record of records as AsyncIterable<ProjectionType>) {      
      const summary = record.summary;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if ((!summary) || (Object.keys(summary).length === 0 && summary.constructor === Object)) {  // Summary may be null in database even though we've told TS compuler it should be there
        console.log(`No stored procs / triggers summary exists for the following source file, so will be ignored: ${record.filepath}`);
        continue
      }

      for (const storedProcedure of summary.storedProcedures) {
        procsAndTriggers.procs.total++;
        const key = storedProcedure.complexity.toLowerCase() as Complexity;
        procsAndTriggers.procs[key] = procsAndTriggers.procs[key] + 1;
        procsAndTriggers.procs.list.push({
          path: record.filepath,
          type: "STORED PROCEDURE",
          "Function Name": storedProcedure.name,
          complexity: storedProcedure.complexity,
          "Lines Of Code": storedProcedure.linesOfCode,
          purpose: storedProcedure.purpose,
        });
      }

      for (const trigger of summary.triggers) {
        procsAndTriggers.trigs.total++;
        const key = trigger.complexity.toLowerCase() as Complexity;
        procsAndTriggers.trigs[key] = procsAndTriggers.trigs[key] + 1;
        procsAndTriggers.trigs.list.push({
          path: record.filepath,
          type: "TRIGGER",
          "Function Name": trigger.name,
          complexity: trigger.complexity,
          "Lines Of Code": trigger.linesOfCode,
          purpose: trigger.purpose,
        });
      }
    }

    return procsAndTriggers;
  }  
}

export default CodeMetadataQueryer;