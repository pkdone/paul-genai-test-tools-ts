import { injectable, inject } from "tsyringe";
import { MongoClient } from "mongodb";
import { AppSummariesRepository } from "../interfaces/app-summaries.repository.interface";
import { AppSummaryRecord, AppSummaryDescAndLLMProvider, PartialAppSummaryRecord } from "../models/app-summary.model";
import { TOKENS } from "../../di/tokens";
import { databaseConfig } from "../../config";
import { BaseRepository } from "./base.repository";

/**
 * MongoDB implementation of the App Summaries repository
 */
@injectable()
export default class AppSummariesRepositoryImpl extends BaseRepository<AppSummaryRecord> implements AppSummariesRepository {
  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.MongoClient) mongoClient: MongoClient) {
    super(mongoClient, databaseConfig.SUMMARIES_COLLCTN_NAME);
  }

  /**
   * Create or replace an app summary record
   */
  async createOrReplaceAppSummary(record: AppSummaryRecord): Promise<void> {
    await this.collection.replaceOne(
      { projectName: record.projectName },
      record,
      { upsert: true }
    );
  }

  /**
   * Update an existing app summary record
   */
  async updateAppSummary(projectName: string, updates: PartialAppSummaryRecord): Promise<void> {
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
   * Get app summary info for reporting (description and LLM provider)
   */
  async getProjectAppSummaryDescAndLLMProvider(projectName: string): Promise<AppSummaryDescAndLLMProvider | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, appdescription: 1, llmProvider: 1 },
    };
    return await this.collection.findOne<AppSummaryDescAndLLMProvider>(query, options);
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
  async getProjectAppSummaryField<T = string>(projectName: string, fieldName: string): Promise<T | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, [fieldName]: 1 },
    };
    const record = await this.collection.findOne<Record<string, T>>(query, options);
    return record?.[fieldName] ?? null;
  }
} 