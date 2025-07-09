import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../llm/core/llm-router";
import { appConfig } from "../../config/app.config";
import { logErrorMsgAndDetail } from "../../common/utils/error-utils";
import { joinArrayWithSeparators } from "../../common/utils/text-utils";
import { LLMStructuredResponseInvoker } from "../../llm/utils/llm-structured-response-invoker";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { PartialAppSummaryRecord } from "../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../di/tokens";
import { SummaryCategory, summaryCategoriesConfig } from "../../config/summary-categories.config";
import { AppSummaryCategoryEnum } from "../../schemas/app-summary-categories.schema";
import { createPromptFromConfig } from "../../llm/utils/prompting/prompt-templator";

/**
 * Generates metadata in database collections to capture application information,
 * such as business entities and processes, for a given project.
 */
@injectable()
export default class DBCodeInsightsBackIntoDBGenerator {
  // Base template for all insights generation prompts
  private readonly APP_CATEGORY_SUMMARIZER_TEMPLATE =
    "Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{fileContentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.\n\nThe JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n{{forceJSON}}\n\nSOURCES:\n{{codeContent}}";
  private readonly llmProviderDescription: string;

  /**
   * Creates a new SummariesGenerator.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.LLMStructuredResponseInvoker)
    private readonly llmUtilityService: LLMStructuredResponseInvoker,
  ) {
    this.llmProviderDescription = this.llmRouter.getModelsUsedDescription();
  }

  /**
   * Gathers metadata about all classes in an application and uses an LLM to identify
   * the business entities and processes for the application, storing the results
   * in the database.
   */
  async generateSummariesDataInDB(): Promise<void> {
    const sourceFileSummaries = await this.buildSourceFileListSummaryList();

    if (sourceFileSummaries.length === 0) {
      throw new Error(
        "No existing code file summaries found in the metadata database. " +
          "Please ensure you have run the script to process the source data first.",
      );
    }

    await this.appSummariesRepository.createOrReplaceAppSummary({
      projectName: this.projectName,
      llmProvider: this.llmProviderDescription,
    });
    const categories: SummaryCategory[] = AppSummaryCategoryEnum.options;
    await Promise.all(
      categories.map(async (category) =>
        this.generateAndRecordDataForCategory(category, sourceFileSummaries),
      ),
    );
  }

  /**
   * Returns a list of source file summaries with basic info.
   */
  private async buildSourceFileListSummaryList(): Promise<string[]> {
    const srcFilesList: string[] = [];
    const records = await this.sourcesRepository.getProjectSourcesSummaries(this.projectName, [
      ...appConfig.SOURCE_FILES_FOR_CODE,
    ]);

    for (const record of records) {
      if (!record.summary || Object.keys(record.summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = record.summary.classpath ?? record.filepath;
      const purpose = record.summary.purpose ?? "No purpose available";
      const implementation = record.summary.implementation ?? "No implementation details available";
      srcFilesList.push(
        `* ${fileLabel}: ${purpose} ${implementation}`,
      );
    }

    return srcFilesList;
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the
   * dataset under a named field of the main application summary record.
   */
  private async generateAndRecordDataForCategory(
    category: SummaryCategory,
    sourceFileSummaries: string[],
  ): Promise<void> {
    const categoryLabel = summaryCategoriesConfig[category].label;
    let validatedData: PartialAppSummaryRecord | null = null;

    try {
      console.log(`Processing ${categoryLabel}`);
      validatedData = await this.getCategorySummaryAsJSON(category, sourceFileSummaries);
      if (!validatedData) return;
      await this.appSummariesRepository.updateAppSummary(this.projectName, validatedData);
      console.log(`Captured main ${categoryLabel} details into database`);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the
   * dataset under a named field of the main application summary record.
   */
  private async getCategorySummaryAsJSON(
    category: SummaryCategory,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      const schema = summaryCategoriesConfig[category].schema;
      const resourceName = `${String(category)} - generate-${String(category)}.prompt`;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      const prompt = this.createInsightsPrompt(category, content);
      
      // Note: The explicit 'unknown' typing is needed to avoid unsafe assignment lint errors
      // because the schema config uses generic z.ZodType which resolves to 'any'
      const llmResponse: unknown = await this.llmUtilityService.getStructuredResponse(
        resourceName,
        prompt,
        schema,
        categoryLabel,
      );
      
      // Use the category-specific schema to validate the response
      const parsed = schema.safeParse(llmResponse);
      
      if (!parsed.success) {
        console.warn(
          `Schema validation failed for ${categoryLabel}: ${parsed.error.message}`,
        );
        return null;
      }
      
      return parsed.data as PartialAppSummaryRecord;
    } catch (error) {
      console.warn(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * Generic function to create any insights prompt using the data-driven approach
   */
  private createInsightsPrompt(type: SummaryCategory, codeContent: string): string {
    const config = summaryCategoriesConfig[type];
    return createPromptFromConfig(
      this.APP_CATEGORY_SUMMARIZER_TEMPLATE,
      {
        instructions: config.description,
        schema: config.schema,
        fileContentDesc: "source files",
      },
      codeContent,
    );
  }
}
