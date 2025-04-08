import LLMRouter from "../llm/llm-router";
import appConst from "../env/app-consts";
import { MongoClient, Collection } from "mongodb";
import CodeMetadataQueryer from "./code-metadata-queryer";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { joinArrayWithSeparators } from "../utils/text-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";
import { transformJSToTSFilePath } from "../utils/fs-utils";

/**
 * Generates metadata in database collections to capture application information,
 * such as business entities and processes, for a given project.
 */
class SummariesGenerator {
  private readonly promptBuilder = new PromptBuilder();
  private readonly destinationCollection: Collection;
  private readonly llmProviderDescription: string;
  private readonly codeMetadataQueryer: CodeMetadataQueryer;

  /**
   * Creates a new SummariesGenerator.
   */
  constructor(
    mongoClient: MongoClient,
    private readonly llmRouter: LLMRouter,
    databaseName: string,
    sourceCollectionName: string,
    destinationCollectionName: string,
    private readonly projectName: string,
  ) {
    const db = mongoClient.db(databaseName);
    this.destinationCollection = db.collection(destinationCollectionName);
    this.codeMetadataQueryer = new CodeMetadataQueryer(
      mongoClient,
      databaseName,
      sourceCollectionName,
      projectName
    );
    this.llmProviderDescription = llmRouter.getModelsUsedDescription();
  }

  /**
   * Gathers metadata about all classes in an application and uses an LLM to identify
   * the business entities and processes for the application, storing the results
   * in the database.
   */
  async generateSummariesDataInDB() {
    const sourceFileSummaries = await this.codeMetadataQueryer.buildSourceFileListSummaryList();

    if (sourceFileSummaries.length === 0) {
      throw new Error(
        "No existing code file summaries found in the metadata database. " +
          "Please ensure you have run the script to process the source data first."
      );
    }

    await this.createAppSummaryRecordInDB({ llmProvider: this.llmProviderDescription });
    const categories = [
      appConst.APP_DESCRIPTION_KEY,
      ...appConst.APP_SUMMARY_ARRAY_FIELDS_TO_GENERATE_KEYS,
    ];
    await Promise.all(
      categories.map(async (category) => this.generateDataForCategory(category, sourceFileSummaries))
    );
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category),
   * and then saves the dataset under a named field of the main application summary record.
   */
  private async generateDataForCategory(
    category: string,
    sourceFileSummaries: string[]
  ): Promise<void> {
    const categoryLabel = appConst.CATEGORY_TITLES[category as keyof typeof appConst.CATEGORY_TITLES];

    try {
      console.log(`Processing ${categoryLabel}`);
      const promptFileName = `generate-${category}.prompt`;
      const promptFilePath = transformJSToTSFilePath(
        __dirname,
        appConst.PROMPTS_FOLDER_NAME,
        promptFileName
      );
      const resourceName = `${category} - ${promptFileName}`;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      const contentToReplaceList = [{ label: appConst.PROMPT_CONTENT_BLOCK_LABEL, content }];
      const prompt = await this.promptBuilder.buildPrompt(promptFilePath, contentToReplaceList);
      const keysValuesObject = await this.llmRouter.executeCompletion(
        promptFilePath,
        prompt,
        true,
        {
          resource: resourceName,
          requireJSON: true,
        }
      );

      if (keysValuesObject && typeof keysValuesObject === "object" && Object.hasOwn(keysValuesObject, category)) {
        await this.updateAppSummaryRecord(keysValuesObject as Record<string, unknown>);
        console.log(`Captured main ${categoryLabel} details into database`);
      } else {
        console.warn(`WARNING: Unable to generate and persist ${categoryLabel} metadata. No valid LLM output found.` );
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Inserts or replaces a single 'app summary' skeleton record in the collection,
   * keyed by the project name.
   */
  private async createAppSummaryRecordInDB(fieldValuesToInclude: Record<string, unknown> = {}) {
    const record = { projectName: this.projectName, ...fieldValuesToInclude };
    await this.destinationCollection.replaceOne(
      { projectName: this.projectName },
      record,
      { upsert: true }
    );
  }

  /**
   * Updates the existing 'app summary' record with the specified key-value pairs.
   */
  private async updateAppSummaryRecord(keysValuesObject: Record<string, unknown> ) {
    const result = await this.destinationCollection.updateOne(
      { projectName: this.projectName },
      { $set: keysValuesObject }
    );

    if (result.modifiedCount < 1) {
      throw new Error(
        `Unable to insert dataset with field name(s) '${Object.keys(keysValuesObject).join(", ")}' ` +
          `into collection '${this.destinationCollection.collectionName}'.`
      );
    }
  }
}

export default SummariesGenerator;
