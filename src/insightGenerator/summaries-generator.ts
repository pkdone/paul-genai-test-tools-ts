import LLMRouter from "../llm/llm-router";
import appConst from "../types/app-constants";
import { MongoClient, Collection } from "mongodb";
import CodeMetadataQueryer from "./code-metadata-queryer";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { LLMModelQuality } from "../types/llm-types";
import { joinArrayWithSeparators } from "../utils/text-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";
import { transformJSToTSFilePath } from "../utils/fs-utils";

/** 
 * Responsible for generating metadata in database collections to caputure applicaiton information
 * like the business entities or the business processes in an applicaiton.
 */
class SummariesGenerator {
  // Private fields
  private readonly promptBuilder = new PromptBuilder();
  private readonly destColtn: Collection;
  private readonly llmProviderDescription: string;
  private readonly codeMetadataQueryer: CodeMetadataQueryer;

  /**
   * Constructor.
   */
  constructor(mongoClient: MongoClient, private readonly llmRouter: LLMRouter, databaseName: string,
              sourceCollectionName: string, destinationCollectionName: string,
              private readonly projectName: string) {   
    const db = mongoClient.db(databaseName);    
    this.destColtn = db.collection(destinationCollectionName);
    this.codeMetadataQueryer = new CodeMetadataQueryer(mongoClient, databaseName, sourceCollectionName, projectName);
    this.llmProviderDescription = llmRouter.getModelsUsedDescription();
  }


  /** 
   * Gather metdata about all classes in an application and then use an LLM to identify the
   * business entities and the business proesses for the application, storing this resulting
   * data in appropriate database collections.
   */
  async generateSummariesDataIntoInDB() {    
    const srcFilesSummaries = await this.codeMetadataQueryer.buildSourceFileListSummaryList();
    if (srcFilesSummaries.length <= 0) throw new Error("No existing code file summaries found in the metadata database to be able to feed the LLM to build application summary from - ensure you first run the script to process the source data"); 
    await this.createAppSummaryRecordInDB({ llmProvider: this.llmProviderDescription });
    const jobs = [];
    
    for (const category of [appConst.APP_DESCRIPTION_KEY, ...appConst.APP_SUMMARY_ARRAY_FIELDS_TO_GENERATE_KEYS]) {
      jobs.push(this.dataSetGeneratorJob(category, srcFilesSummaries));
    }

    await Promise.all(jobs);   
  }


  /** 
   * Job to call an LLM to summarise a specific set of data and then save this data set hanging off
   * a field of the main app summary collection.
   */
  private async dataSetGeneratorJob(category: string, srcFilesSummaries: string[]) {
    const categoryLabel = appConst.CATEGORY_TITLES[category as keyof typeof appConst.CATEGORY_TITLES];

    try {
      console.log(`Processing ${categoryLabel}`);
      const promptFileName = `generate-${category}.prompt`;
      const promptFilePath = transformJSToTSFilePath(__dirname, appConst.PROMPTS_FOLDER_NAME, promptFileName);
      const resourceName = `${category} - ${promptFileName}`;
      const content = joinArrayWithSeparators(srcFilesSummaries);
      const contentToReplaceList = [{ label: appConst.PROMPT_CONTENT_BLOCK_LABEL, content }];
      const prompt = await this.promptBuilder.buildPrompt(promptFilePath, contentToReplaceList);
      const keysValuesObject = await this.llmRouter.executeCompletion(promptFilePath, prompt, LLMModelQuality.REGULAR_PLUS, true, {resource: resourceName, requireJSON: true});      

      if (keysValuesObject && typeof keysValuesObject === 'object' && category in keysValuesObject) {
        await this.insertNamedFieldsWithValuesIntoAppSummaryDBRecord(keysValuesObject);
        console.log(`Captured main ${categoryLabel} details into database`);
      } else {
        console.log(`WARNING: Unable to generate and persist ${categoryLabel} metadata because none were found using the LLM with the sources metadata`);
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);          
    }
  }

  
  /** 
   * Insert one new app summary 'skeleton' record into colleciton, replacing older one if it
   * exsits.
   */
  private async createAppSummaryRecordInDB(fieldValuesToInclude = {}) {
    const record = { projectName: this.projectName, ...fieldValuesToInclude };
    await this.destColtn.replaceOne(
      { projectName: this.projectName },
      record,
      { upsert: true },
    );
  }


  /**
   * Set a named fields and their values of the matching app summary record in a colleciton.
   */
  private async insertNamedFieldsWithValuesIntoAppSummaryDBRecord(keysValuesObject: object) {
    const result = await this.destColtn.updateOne(
      { projectName: this.projectName },
      { $set: keysValuesObject }
    );
    if (result.modifiedCount < 1) throw new Error(`Unable to insert dataset with field name(s) '${Object.keys(keysValuesObject).toString()}' of collection '${this.destColtn.collectionName}'`);
  }
}

export default SummariesGenerator;