import { injectable, inject } from "tsyringe";
import { MongoClient } from "mongodb";
import { AppSummariesRepository } from "./app-summaries.repository.interface";
import {
  AppSummaryRecord,
  ProjectedAppSummaryDescAndLLMProvider,
  PartialAppSummaryRecord,
} from "./app-summary.model";
import { TOKENS } from "../../di/tokens";
import { databaseConfig } from "../../config/database.config";
import { BaseRepository } from "../base.repository";

/**
 * MongoDB implementation of the App Summaries repository
 */
@injectable()
export default class AppSummariesRepositoryImpl
  extends BaseRepository<AppSummaryRecord>
  implements AppSummariesRepository
{
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
    await this.collection.replaceOne({ projectName: record.projectName }, record, { upsert: true });
  }

  /**
   * Update an existing app summary record
   */
  async updateAppSummary(projectName: string, updates: PartialAppSummaryRecord): Promise<void> {
    const result = await this.collection.updateOne({ projectName }, { $set: updates });

    if (result.modifiedCount < 1) {
      throw new Error(
        `Unable to update app summary with field name(s) '${Object.keys(updates).join(", ")}' ` +
          `for project '${projectName}' in collection '${this.collection.collectionName}'.`,
      );
    }
  }

  /**
   * Get app summary info for reporting (description and LLM provider)
   */
  async getProjectAppSummaryDescAndLLMProvider(
    projectName: string,
  ): Promise<ProjectedAppSummaryDescAndLLMProvider | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, appDescription: 1, llmProvider: 1 },
    };
    return await this.collection.findOne<ProjectedAppSummaryDescAndLLMProvider>(query, options);
  }

  /**
   * Get specific field data from app summary
   *
   * Usage examples:
   *  getProjectAppSummaryField(projectName, 'llmProvider') - returns Promise<string | null>
   *  getProjectAppSummaryField(projectName, 'businessProcesses') - returns Promise<AppSummaryNameDescArray | null>
   *  getProjectAppSummaryField(projectName, 'appDescription') - returns Promise<string | null>
   */
  async getProjectAppSummaryField<K extends keyof AppSummaryRecord>(
    projectName: string,
    fieldName: K,
  ): Promise<AppSummaryRecord[K] | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, [fieldName]: 1 },
    };
    const record = await this.collection.findOne<Pick<AppSummaryRecord, K>>(query, options);
    return record?.[fieldName] ?? null;
  }
}
