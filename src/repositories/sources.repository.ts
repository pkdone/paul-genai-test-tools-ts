import { injectable, inject } from "tsyringe";
import { MongoClient, Collection, Double, Sort } from "mongodb";
import { ISourcesRepository } from "./interfaces/sources.repository.interface";
import { SourceFileRecord, SourceFileMetadata, SourceFileSummaryInfo } from "./models/source.model";
import { TOKENS } from "../di/tokens";
import { databaseConfig } from "../config";
import { logErrorMsgAndDetail } from "../utils/error-utils";

/**
 * MongoDB implementation of the Sources repository
 */
@injectable()
export default class SourcesRepository implements ISourcesRepository {
  private readonly collection: Collection<SourceFileRecord>;

  constructor(@inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient) {
    const db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<SourceFileRecord>(databaseConfig.SOURCES_COLLCTN_NAME);
  }

  /**
   * Insert a source file record into the database
   */
  async insertSourceFile(sourceFileData: Omit<SourceFileRecord, "_id">): Promise<void> {
    await this.collection.insertOne(sourceFileData);
  }

  /**
   * Delete all source files for a specific project
   */
  async deleteSourceFilesByProject(projectName: string): Promise<void> {
    await this.collection.deleteMany({ projectName });
  }

  /**
   * Check if a source file already exists for a project
   */
  async doesSourceFileExist(projectName: string, filepath: string): Promise<boolean> {
    const query = { 
      projectName, 
      filepath,
    };
    const options = {
      projection: { _id: 1 },
    };
    const result = await this.collection.findOne(query, options);
    return result !== null;
  }

  /**
   * Get source file summaries for a project
   */
  async getSourceFileSummaries(projectName: string, fileTypes: string[]): Promise<SourceFileSummaryInfo[]> {
    const query = {
      projectName,
      type: { $in: fileTypes },
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
    
    const cursor = this.collection.find(query, options);
    const results: SourceFileSummaryInfo[] = [];
    
    for await (const record of cursor) {
      results.push({
        filepath: record.filepath,
        summary: record.summary ? {
          classpath: record.summary.classpath,
          purpose: record.summary.purpose,
          implementation: record.summary.implementation,
        } : undefined,
      });
    }
    
    return results;
  }

  /**
   * Get database integration information for a project
   */
  async getDatabaseIntegrations(projectName: string, fileTypes: string[]): Promise<{
    path: string;
    mechanism: string;
    description: string;
  }[]> {
    const query = {
      projectName,
      type: { $in: fileTypes },
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

    const cursor = this.collection.find(query, options);
    const results: { path: string; mechanism: string; description: string }[] = [];
    
    for await (const record of cursor) {
      if (record.summary?.databaseIntegration) {
        results.push({
          path: record.summary.classpath ?? record.filepath,
          mechanism: record.summary.databaseIntegration.mechanism,
          description: record.summary.databaseIntegration.description,
        });
      }
    }
    
    return results;
  }

  /**
   * Get stored procedures and triggers information for a project
   */
  async getStoredProceduresAndTriggers(projectName: string, fileTypes: string[]): Promise<SourceFileSummaryInfo[]> {
    const query = {
      $and: [
        { projectName },
        { type: { $in: fileTypes } },
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

    const cursor = this.collection.find(query, options);
    const results: SourceFileSummaryInfo[] = [];
    
    for await (const record of cursor) {
      results.push({
        filepath: record.filepath,
        ...(record.summary && { summary: record.summary }),
      });
    }
    
    return results;
  }

  /**
   * Perform vector search on source file content
   */
  async vectorSearchContent(
    projectName: string, 
    fileType: string, 
    queryVector: Double[], 
    numCandidates: number, 
    limit: number
  ): Promise<SourceFileMetadata[]> {
    const pipeline = [
      {
        $vectorSearch: {
          index: databaseConfig.CONTENT_VECTOR_INDEX_NAME,
          path: databaseConfig.CONTENT_VECTOR_INDEX,
          filter: {
            $and: [
              { projectName: { $eq: projectName } },
              { type: { $eq: fileType } },
            ],
          },
          queryVector: queryVector,
          numCandidates,
          limit,
        }
      },
      {
        $project: {
          _id: 0,
          projectName: 1,
          filepath: 1,
          type: 1,
          content: 1,
          summary: 1,
        }
      },
    ];

    try {
      return await this.collection.aggregate<SourceFileMetadata>(pipeline).toArray();
    } catch (error: unknown) {
      logErrorMsgAndDetail(
        `Problem performing Atlas Vector Search aggregation - ensure the vector index is defined for the '${databaseConfig.SOURCES_COLLCTN_NAME}' collection`, 
        error
      );
      throw error;
    }
  }

  /**
   * Get file paths for a specific project (used for testing)
   */
  async getFilePaths(projectName: string): Promise<string[]> {
    const query = { projectName };
    const options = { projection: { filepath: 1 } };
    
    const cursor = this.collection.find(query, options);
    const results: string[] = [];
    
    for await (const record of cursor) {
      results.push(record.filepath);
    }
    
    return results;
  }

  /**
   * Get file count for a project
   */
  async getFileCount(projectName: string): Promise<number> {
    const pipeline = [
      { $match: { projectName } },
      { $group: { _id: "", count: { $sum: 1 } } }
    ];

    const result = await this.collection.aggregate<{ count: number }>(pipeline).toArray();
    return result.length > 0 && result[0] ? result[0].count : 0;
  }

  /**
   * Get total lines of code for a project
   */
  async getTotalLinesOfCode(projectName: string): Promise<number> {
    const pipeline = [
      { $match: { projectName } },
      { $group: { _id: "", count: { $sum: "$linesCount" } } }
    ];

    const result = await this.collection.aggregate<{ count: number }>(pipeline).toArray();
    return result.length > 0 && result[0] ? result[0].count : 0;
  }
} 