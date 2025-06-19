import { injectable, inject } from "tsyringe";
import { MongoClient, Collection, IndexSpecification } from "mongodb";
import { IAppSummariesRepository } from "./interfaces/app-summaries.repository.interface";
import { AppSummaryRecord, AppSummaryShortInfo, AppSummaryUpdate } from "./models/app-summary.model";
import { TOKENS } from "../di/tokens";
import { databaseConfig } from "../config";

/**
 * MongoDB implementation of the App Summaries repository
 */
@injectable()
export default class AppSummariesRepository implements IAppSummariesRepository {
  // Private fields
  private readonly collection: Collection<AppSummaryRecord>;

  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.MongoClient) mongoClient: MongoClient) {
    const db = mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<AppSummaryRecord>(databaseConfig.SUMMARIES_COLLCTN_NAME);
  }

  /**
   * Ensure required indexes exist for the app summaries collection
   */
  async ensureIndexes(): Promise<void> {
    await this.createNormalIndexIfNotExists({ projectName: 1 });
  }

  /**
   * Create or replace an app summary record
   */
  async createOrReplaceAppSummary(projectName: string, data: Partial<AppSummaryRecord>): Promise<void> {
    const record = { projectName, ...data };
    await this.collection.replaceOne(
      { projectName },
      record,
      { upsert: true }
    );
  }

  /**
   * Update an existing app summary record
   */
  async updateAppSummary(projectName: string, updates: AppSummaryUpdate): Promise<void> {
    const result = await this.collection.updateOne(
      { projectName },
      { $set: updates }
    );

    if (result.modifiedCount < 1) {
      throw new Error(
        `Unable to update app summary with field name(s) '${Object.keys(updates).join(", ")}' ` +
          `for project '${projectName}' in collection '${this.collection.collectionName}'.`
      );
    }
  }

  /**
   * Get an app summary record by project name
   */
  async getAppSummary(projectName: string): Promise<AppSummaryRecord | null> {
    return await this.collection.findOne({ projectName });
  }

  /**
   * Get app summary info for reporting (description and LLM provider)
   */
  async getAppSummaryShortInfo(projectName: string): Promise<AppSummaryShortInfo | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, appdescription: 1, llmProvider: 1 },
    };
    return await this.collection.findOne(query, options);
  }

  /**
   * Get specific field data from app summary
   * 
   * For string fields:
   *  getAppSummaryField<string>(projectName, 'llmProvider')
   * For array fields:
   *  getAppSummaryField<string[]>(projectName, 'businessProcesses')
   * For custom object arrays:
   *  getAppSummaryField<BusinessProcess[]>(projectName, 'busprocesses')
   */
  async getAppSummaryField<T = string>(projectName: string, fieldName: string): Promise<T | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, [fieldName]: 1 },
    };
    const record = await this.collection.findOne<Record<string, T>>(query, options);
    return record?.[fieldName] ?? null;
  }

  /**
   * Create normal MongoDB collection indexes if they don't yet exist.
   */
  private async createNormalIndexIfNotExists(indexSpec: IndexSpecification, isUnique = false): Promise<void> {
    await this.collection.createIndex(indexSpec, { unique: isUnique });
    console.log(`Ensured normal indexes exist for the MongoDB database collection: '${this.collection.dbName}.${this.collection.collectionName}'`);
  }
} 