import { z } from "zod";
import { generateMDBJSONSchema, zBsonObjectId } from "../../common/mdb/zod-to-mdb-json-schema";
import {
  AppSummaryCategory,
  appSummaryCategoryConfig,
} from "../../features/insights/insights.config";
import { AppSummaryCategoryEnum, nameDescSchema } from "../../schemas/app-summaries.schema";

/**
 * Schema for arrays of name-description pairs used in app summaries
 */
export const appSummaryNameDescArraySchema = z.array(nameDescSchema);

const dynamicProperties = AppSummaryCategoryEnum.options.reduce(
  (acc, category) => {
    // The schema for the LLM response is a key-value pair, but the DB stores the value under the key.
    // We extract the value's schema from the key-value pair schema.
    const keyValSchema = appSummaryCategoryConfig[category].schema as z.ZodObject<
      Record<string, z.ZodTypeAny>
    >;
    const valueSchema = keyValSchema.shape[category];
    acc[category] = valueSchema.optional();
    return acc;
  },
  {} as Record<AppSummaryCategory, z.ZodOptional<z.ZodTypeAny>>,
);

/**
 * Zod schema for application summary records in the database
 */
export const appSummaryRecordSchema = z
  .object({
    _id: zBsonObjectId,
    projectName: z.string(),
    llmProvider: z.string(),
    ...dynamicProperties,
  })
  .passthrough();

/**
 * Schema for MongoDB projected document with app description and LLM provider fields
 * Note: For non-simple projects, and especially for partial projections of nested fields, we need
 * to create a custom schema since MongoDB projections revert to returning field types of 'unknown'.
 */
export const projectedAppSummaryDescAndLLMProviderSchema = appSummaryRecordSchema.pick({
  appDescription: true,
  llmProvider: true,
});

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type AppSummaryNameDescArray = z.infer<typeof appSummaryNameDescArraySchema>;

/**
 * Interface representing an application summary record in the database
 * (making it optional for _id)
 */
type AppSummaryRecordTmp = z.infer<typeof appSummaryRecordSchema>;
export type AppSummaryRecord = Omit<AppSummaryRecordTmp, "_id"> &
  Partial<Pick<AppSummaryRecordTmp, "_id">>;

/**
 * Type for arrays of name-description pairs used in app summaries
 */
export type PartialAppSummaryRecord = Partial<AppSummaryRecord>;

/**
 * Type for MongoDB projected document with app description and LLM provider fields
 */
export type ProjectedAppSummaryDescAndLLMProvider = z.infer<
  typeof projectedAppSummaryDescAndLLMProviderSchema
>;

/**
 * Generate JSON schema for application summary records
 */
export function getJSONSchema() {
  return generateMDBJSONSchema(appSummaryRecordSchema);
}
