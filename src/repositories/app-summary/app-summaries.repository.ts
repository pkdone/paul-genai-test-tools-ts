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
import { logMongoValidationErrorIfPresent } from "../../common/mdb/mdb-utils";

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
    try {
      await this.collection.replaceOne({ projectName: record.projectName }, record, {
        upsert: true,
      });
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
    }
  }

  /**
   * Update an existing app summary record
   */
  async updateAppSummary(projectName: string, updates: PartialAppSummaryRecord): Promise<void> {
    try {
      await this.collection.updateOne({ projectName }, { $set: updates });
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
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
   * Retrieves the value of a specific field from an app summary record for the given project.
   *
   * The return type is inferred based on the requested field name, and will be the non-nullable type
   * of that field or `null` if the record or field is not found.
   *
   * - If the field exists but is `undefined`, `null` is returned.
   * - If the record does not exist, `null` is returned.
   *
   * Usage examples:
   *   getProjectAppSummaryField(projectName, 'llmProvider') // Promise<string | null>
   *   getProjectAppSummaryField(projectName, 'businessProcesses') // Promise<AppSummaryNameDescArray | null>
   *   getProjectAppSummaryField(projectName, 'appDescription') // Promise<string | null>
   *
   * @param projectName - The name of the project.
   * @param fieldName - The field to retrieve from the app summary record.
   * @returns The value of the requested field, or null if not found.
   */
  async getProjectAppSummaryField<K extends keyof AppSummaryRecord>(
    projectName: string,
    fieldName: K,
  ): Promise<NonNullable<AppSummaryRecord[K]> | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, [fieldName]: 1 },
    };
    const record = await this.collection.findOne<Pick<AppSummaryRecord, K>>(query, options);
    return record && fieldName in record ? (record[fieldName] ?? null) : null;
  }
}
