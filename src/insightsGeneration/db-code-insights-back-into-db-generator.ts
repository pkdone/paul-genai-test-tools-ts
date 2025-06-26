import { injectable, inject } from "tsyringe";
import type LLMRouter from "../llm/llm-router";
import { fileSystemConfig, reportingConfig } from "../config";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { joinArrayWithSeparators } from "../utils/text-utils";
import type { AppSummariesRepository } from "../repositories/interfaces/app-summaries.repository.interface";
import type { SourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import type { PartialAppSummaryRecord } from "../repositories/models/app-summary.model";
import { TOKENS } from "../di/tokens";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as insightsPrompts from './prompts';
import * as insightsSchemas from './schemas';

/**
 * Generates metadata in database collections to capture application information,
 * such as business entities and processes, for a given project.
 */
@injectable()
export default class DBCodeInsightsBackIntoDBGenerator {
  private readonly llmProviderDescription: string;

  /**
   * Creates a new SummariesGenerator.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
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

    await this.appSummariesRepository.createOrReplaceAppSummary({ projectName: this.projectName, llmProvider: this.llmProviderDescription });
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
    const records = await this.sourcesRepository.getProjectSourcesSummaries(this.projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);

    for (const record of records) {
      if (!record.summary || Object.keys(record.summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = record.summary.classpath ?? record.filepath;
      srcFilesList.push(`* ${fileLabel}: ${record.summary.purpose} ${record.summary.implementation}`);
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
      const { promptCreator, schema } = this.getPromptAndSchemaForCategory(category);
      const resourceName = `${category} - generate-${category}.prompt`;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      
      // Create the prompt using type-safe prompt
      const prompt = promptCreator(content);
      
      // Initial attempt
      const llmResponse = await this.llmRouter.executeCompletion(
        resourceName,
        prompt,
        true,
        { resource: resourceName, requireJSON: true }
      );

      if (llmResponse === null) {
        console.warn(`WARNING: LLM returned null response for ${categoryLabel}.`);
        return;
      }

      // When asJson=true, LLM router returns parsed object, not string
      let parsedJson: unknown;
      if (typeof llmResponse === 'string') {
        // Fallback: if somehow we get a string, parse it
        try {
          parsedJson = JSON.parse(llmResponse);
        } catch (parseError: unknown) {
          logErrorMsgAndDetail(`Failed to parse LLM response as JSON for ${categoryLabel}`, parseError);
          return;
        }
      } else if (typeof llmResponse === 'object') {
        // Expected case: LLM router already parsed the JSON
        parsedJson = llmResponse;
      } else {
        console.warn(`WARNING: LLM returned unexpected response type for ${categoryLabel}: ${typeof llmResponse}.`);
        return;
      }

      let validationResult = schema.safeParse(parsedJson);

      // Retry logic if validation fails
      if (!validationResult.success) {
        console.warn(`Initial validation failed for ${categoryLabel}. Attempting to self-correct...`);
        logErrorMsgAndDetail(`Zod validation failed for ${categoryLabel}`, validationResult.error.format());
        
        const fixItPrompt = `The previous JSON response had validation errors. Please fix the following JSON to strictly match the provided schema.
---
ORIGINAL JSON:
${JSON.stringify(parsedJson)}
---
SCHEMA:
${JSON.stringify(zodToJsonSchema(schema), null, 2)}
---
VALIDATION ERRORS:
${JSON.stringify(validationResult.error.format())}
---
Return ONLY the corrected, valid JSON object.`;
        
        const retryResponse = await this.llmRouter.executeCompletion(
          `${resourceName}-fix`,
          fixItPrompt,
          true,
          { resource: resourceName, requireJSON: true }
        );
        
        if (retryResponse === null) {
          console.warn(`WARNING: LLM failed to provide corrected response for ${categoryLabel}.`);
          return;
        }

        // Handle retry response (should be object when asJson=true)
        if (typeof retryResponse === 'string') {
          try {
            parsedJson = JSON.parse(retryResponse);
          } catch (retryParseError: unknown) {
            logErrorMsgAndDetail(`Error parsing self-corrected response for ${categoryLabel}`, retryParseError);
            return;
          }
        } else if (typeof retryResponse === 'object') {
          parsedJson = retryResponse;
        } else {
          console.warn(`WARNING: LLM retry returned unexpected response type for ${categoryLabel}: ${typeof retryResponse}.`);
          return;
        }

        validationResult = schema.safeParse(parsedJson);
      }

      if (validationResult.success) {
        // Since Zod validation succeeded, we know the data structure is valid
        await this.appSummariesRepository.updateAppSummary(this.projectName, validationResult.data as PartialAppSummaryRecord);
        console.log(`Captured main ${categoryLabel} details into database`);
      } else {
        console.warn(`WARNING: Unable to generate and persist ${categoryLabel} metadata. Validation failed after retry.`);
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Get the appropriate prompt creator function and Zod schema based on category.
   */
  private getPromptAndSchemaForCategory(category: string): {
    promptCreator: (codeContent: string) => string;
    schema: z.ZodType;
  } {
    switch (category) {
      case 'appDescription':
        return {
          promptCreator: insightsPrompts.createAppDescriptionPrompt,
          schema: insightsSchemas.appDescriptionSchema,
        };
      case 'boundedContexts':
        return {
          promptCreator: insightsPrompts.createBoundedContextsPrompt,
          schema: insightsSchemas.boundedContextsSchema,
        };
      case 'businessEntities':
        return {
          promptCreator: insightsPrompts.createBusinessEntitiesPrompt,
          schema: insightsSchemas.businessEntitiesSchema,
        };
      case 'businessProcesses':
        return {
          promptCreator: insightsPrompts.createBusinessProcessesPrompt,
          schema: insightsSchemas.businessProcessesSchema,
        };
      case 'technologies':
        return {
          promptCreator: insightsPrompts.createTechnologiesPrompt,
          schema: insightsSchemas.technologiesSchema,
        };
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }
}


