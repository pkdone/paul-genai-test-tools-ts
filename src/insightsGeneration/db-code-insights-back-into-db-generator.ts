import { injectable, inject } from "tsyringe";
import type LLMRouter from "../llm/llm-router";
import { fileSystemConfig, promptsConfig, reportingConfig } from "../config";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { joinArrayWithSeparators } from "../utils/text-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";
import { transformJSToTSFilePath } from "../utils/path-utils";
import type { IAppSummariesRepository } from "../repositories/interfaces/app-summaries.repository.interface";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import type { AppSummaryUpdate } from "../repositories/models/app-summary.model";
import { TOKENS } from "../di/tokens";


/**
 * Generates metadata in database collections to capture application information,
 * such as business entities and processes, for a given project.
 */
@injectable()
export default class DBCodeInsightsBackIntoDBGenerator {
  private readonly promptBuilder = new PromptBuilder();
  private readonly llmProviderDescription: string;

  /**
   * Creates a new SummariesGenerator.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: IAppSummariesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    private readonly projectName: string,
  ) {
    this.llmProviderDescription = llmRouter.getModelsUsedDescription();
  }

    /**
   * Gathers metadata about all classes in an application and uses an LLM to identify
   * the business entities and processes for the application, storing the results
   * in the database.
   */
  async generateSummariesDataInDB() {
    const sourceFileSummaries = await this.buildSourceFileListSummaryList();

    if (sourceFileSummaries.length === 0) {
      throw new Error(
        "No existing code file summaries found in the metadata database. " +
        "Please ensure you have run the script to process the source data first."
      );
    }

    await this.appSummariesRepository.createOrReplaceAppSummary(this.projectName, { llmProvider: this.llmProviderDescription });
    const categories = Object.keys(reportingConfig.APP_SUMMARIES_CATEGORY_TITLES);
    await Promise.all(
      categories.map(async (category) => this.generateDataForCategory(category, sourceFileSummaries))
    );
  }

  /**
   * Returns a list of source file summaries with basic info.
   */
  async buildSourceFileListSummaryList() {
    const srcFilesList: string[] = [];
    const records = await this.sourcesRepository.getSourceFileSummaries(this.projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);

    for (const record of records) {
      const { summary } = record;

      if (!summary || Object.keys(summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = summary.classpath ?? record.filepath;
      srcFilesList.push(`* ${fileLabel}: ${summary.purpose ?? ""} ${summary.implementation ?? ""}`);
    }
    
    return srcFilesList;
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the 
   * dataset under a named field of the main application summary record.
   */
  private async generateDataForCategory(category: string, sourceFileSummaries: string[]) {
    const categoryLabel = reportingConfig.APP_SUMMARIES_CATEGORY_TITLES[category as keyof typeof reportingConfig.APP_SUMMARIES_CATEGORY_TITLES];

    try {
      console.log(`Processing ${categoryLabel}`);
      const promptFileName = `generate-${category}.prompt`;
      const promptFilePath = transformJSToTSFilePath(__dirname, promptsConfig.PROMPTS_FOLDER_NAME, promptFileName);
      const resourceName = `${category} - ${promptFileName}`;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      const contentToReplaceList = [{ label: promptsConfig.PROMPT_CONTENT_BLOCK_LABEL, content }];
      const prompt = await this.promptBuilder.buildPrompt(promptFilePath, contentToReplaceList);
      const keyValueObject = await this.llmRouter.executeCompletion(
        promptFilePath,
        prompt,
        true,
        { resource: resourceName, requireJSON: true }
      );

      if (keyValueObject && typeof keyValueObject === "object" && Object.hasOwn(keyValueObject, category)) {
        await this.appSummariesRepository.updateAppSummary(this.projectName, keyValueObject as AppSummaryUpdate);
        console.log(`Captured main ${categoryLabel} details into database`);
      } else {
        console.warn(`WARNING: Unable to generate and persist ${categoryLabel} metadata. No valid LLM output found.` );
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }
}


