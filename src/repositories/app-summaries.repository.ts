import { injectable, inject } from "tsyringe";
import { MongoClient, Collection } from "mongodb";
import { IAppSummariesRepository } from "./interfaces/app-summaries.repository.interface";
import { AppSummaryRecord, AppSummaryUpdate } from "./models/app-summary.model";
import { TOKENS } from "../di/tokens";
import { databaseConfig } from "../config";

/**
 * MongoDB implementation of the App Summaries repository
 */
@injectable()
export default class AppSummariesRepository implements IAppSummariesRepository {
  private readonly collection: Collection<AppSummaryRecord>;

  constructor(@inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient) {
    const db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<AppSummaryRecord>(databaseConfig.SUMMARIES_COLLCTN_NAME);
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
   * Get all app summaries
   */
  async getAllAppSummaries(): Promise<AppSummaryRecord[]> {
    return await this.collection.find({}).toArray();
  }

  /**
   * Delete an app summary record
   */
  async deleteAppSummary(projectName: string): Promise<void> {
    await this.collection.deleteOne({ projectName });
  }
} 