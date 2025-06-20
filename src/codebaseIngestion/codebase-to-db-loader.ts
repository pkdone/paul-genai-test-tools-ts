import { injectable, inject } from "tsyringe";
import type LLMRouter from "../llm/llm-router";
import path from "path";
import { fileSystemConfig, mcpConfig } from "../config";
import { readFile, buildDirDescendingListOfFiles } from "../utils/fs-utils";
import { getFileSuffix } from "../utils/path-utils";
import { countLines } from "../utils/text-utils";
import { promiseAllThrottled } from "../utils/control-utils";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { BaseFileSummary, JavaScriptFileSummary } from "./types";
import { FileSummarizer } from "./file-summarizer";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import type { SourceFileRecord } from "../repositories/models/source.model";
import { TOKENS } from "../di/tokens";

/** 
 * Loads each source file into a class to represent it.
 */
@injectable()
export default class CodebaseToDBLoader {
  // Private fields
  private doneCheckingAlreadyCapturedFiles = false;
  
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.FileSummarizer) private readonly fileSummarizer: FileSummarizer
  ) {}

  /**
   * Generate the set of representations of source files including each one's content and metadata.
   */
  async loadIntoDB(projectName: string, srcDirPath: string, ignoreIfAlreadyCaptured: boolean): Promise<void> {
    const srcFilepaths = await buildDirDescendingListOfFiles(srcDirPath);
    await this.insertSourceContentIntoDB(srcFilepaths, projectName, srcDirPath, ignoreIfAlreadyCaptured);
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async insertSourceContentIntoDB(filepaths: string[], projectName: string, srcDirPath: string, ignoreIfAlreadyCaptured: boolean) {
    console.log(`Creating metadata for ${filepaths.length} files to the MongoDB database sources collection`);
    
    if (!ignoreIfAlreadyCaptured) {
      console.log(`Deleting older version of the project's metadata files from the database to enable the metadata to be re-generated - change env var 'IGNORE_ALREADY_PROCESSED_FILES' to avoid re-processing of all files`);
      await this.sourcesRepository.deleteSourceFilesByProject(projectName);
    }

    const jobs = filepaths.map(filepath => async () => {
      try {
        await this.captureSrcFileMetadataToRepository(filepath, projectName, srcDirPath, ignoreIfAlreadyCaptured);
      } catch (error: unknown) {
        logErrorMsgAndDetail(`Problem introspecting and processing source file: ${filepath}`, error);
      }
    });

    await promiseAllThrottled(jobs, mcpConfig.MAX_CONCURRENCY);
  }

  /**
   * Capture metadata for a file using the LLM.
   */
  private async captureSrcFileMetadataToRepository(fullFilepath: string, projectName: string, srcDirPath: string, ignoreIfAlreadyCaptured: boolean) {    
    const type = getFileSuffix(fullFilepath).toLowerCase();
    const filepath = fullFilepath.replace(`${srcDirPath}/`, "");    
    if ((fileSystemConfig.BINARY_FILE_SUFFIX_IGNORE_LIST as readonly string[]).includes(type)) return;  // Skip file if it has binary content

    if (ignoreIfAlreadyCaptured && (await this.sourcesRepository.doesSourceFileExist(projectName, filepath))) {
      if (!this.doneCheckingAlreadyCapturedFiles) {
        console.log(`Not capturing some of the metadata files into the database because they've already been captured by a previous run - change env var 'IGNORE_ALREADY_PROCESSED_FILES' to force re-processing of all files`);
        this.doneCheckingAlreadyCapturedFiles = true;
      }

      return;
    }
    
    const rawContent = await readFile(fullFilepath);
    const content = rawContent.trim();
    if (!content) return;  // Skip empty files
    const filename = path.basename(filepath);
    const linesCount = countLines(content);    
    const summaryResult = await this.fileSummarizer.getSummaryAsJSON(filepath, type, content);
    let summary: BaseFileSummary | JavaScriptFileSummary | undefined;
    let summaryError: string | undefined;
    let summaryVector: number[] | undefined;

    if ('error' in summaryResult && typeof summaryResult.error === 'string') {
      summaryError = summaryResult.error;
    } else if (typeof summaryResult === 'object' && !('error' in summaryResult)) {
      summary = summaryResult as BaseFileSummary | JavaScriptFileSummary;
      const summaryVectorResult = await this.getContentEmbeddings(filepath, JSON.stringify(summary), "summary");
      summaryVector = summaryVectorResult ?? undefined;
    } else {
      summaryError = "Unexpected summary result structure";
    }
    
    const contentVectorResult = await this.getContentEmbeddings(filepath, content, "content");
    const contentVector = contentVectorResult ?? undefined;
    
    // Build the source file record with conditional optional fields
    const sourceFileRecord: Omit<SourceFileRecord, "_id"> = {
      projectName: projectName,
      filename,
      filepath,
      type,
      linesCount,
      content,
      ...(summary !== undefined && { summary }),
      ...(summaryError !== undefined && { summaryError }),
      ...(summaryVector !== undefined && { summaryVector }),
      ...(contentVector !== undefined && { contentVector }),
    };
    
    await this.sourcesRepository.insertSourceFile(sourceFileRecord);
  }

  /**
   * Get the embeddings vector for a piece of content, limiting the content's size if it is likely
   * to blow the LLM context window size.
   */
  private async getContentEmbeddings(filepath: string, content: string, type: string) {
    return await this.llmRouter.generateEmbeddings(filepath, content, {resource: filepath, type});      
  }




}


