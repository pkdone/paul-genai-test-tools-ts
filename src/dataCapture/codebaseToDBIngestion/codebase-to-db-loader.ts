import { injectable, inject } from "tsyringe";
import type LLMRouter from "../../llm/llm-router";
import path from "path";
import { fileSystemConfig, mcpConfig } from "../../config";
import { readFile, buildDirDescendingListOfFiles } from "../../utils/fs-utils";
import { getFileSuffix } from "../../utils/path-utils";
import { countLines } from "../../utils/text-utils";
import { promiseAllThrottled } from "../../utils/control-utils";
import { logErrorMsgAndDetail } from "../../utils/error-utils";
import { BaseFileSummary, JavaScriptFileSummary } from "./types";
import { FileSummarizer } from "./file-summarizer";
import type { ISourcesRepository } from "../../repositories/interfaces/sources.repository.interface";
import { TOKENS } from "../../di/tokens";

/** 
 * Loads each source file into a class to represent it.
 */
@injectable()
export default class CodebaseToDBLoader {
  // Private fields
  private readonly fileSummarizer: FileSummarizer;
  private doneCheckingAlreadyCapturedFiles = false;
  
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    private readonly projectName: string, 
    private readonly srcDirPath: string, 
    private readonly ignoreIfAlreadyCaptured: boolean
  ) {
    this.fileSummarizer = new FileSummarizer(llmRouter);
  }

  /**
   * Generate the set of representations of source files including each one's content and metadata.
   */
  async loadIntoDB(): Promise<void> {
    const srcFilepaths = await buildDirDescendingListOfFiles(this.srcDirPath);
    await this.insertSourceContentIntoDB(srcFilepaths);
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async insertSourceContentIntoDB(filepaths: string[]) {
    console.log(`Creating metadata for ${filepaths.length} files to the MongoDB database sources collection`);
    
    if (!this.ignoreIfAlreadyCaptured) {
      console.log(`Deleting older version of the project's metadata files from the database to enable the metadata to be re-generated - change env var 'IGNORE_ALREADY_PROCESSED_FILES' to avoid re-processing of all files`);
      await this.sourcesRepository.deleteSourceFilesByProject(this.projectName);
    }

    const jobs = filepaths.map(filepath => async () => {
      try {
        await this.captureSrcFileMetadataToRepository(filepath);
      } catch (error: unknown) {
        logErrorMsgAndDetail(`Problem introspecting and processing source file: ${filepath}`, error);
      }
    });

    await promiseAllThrottled(jobs, mcpConfig.MAX_CONCURRENCY);
  }

  /**
   * Capture metadata for a file using the LLM.
   */
  private async captureSrcFileMetadataToRepository(fullFilepath: string) {    
    const type = getFileSuffix(fullFilepath).toLowerCase();
    const filepath = fullFilepath.replace(`${this.srcDirPath}/`, "");    
    if ((fileSystemConfig.BINARY_FILE_SUFFIX_IGNORE_LIST as readonly string[]).includes(type)) return;  // Skip file if it has binary content

    if ((this.ignoreIfAlreadyCaptured) && (await this.sourcesRepository.doesSourceFileExist(this.projectName, filepath))) {
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
    let summaryVector: number[] | null = null; // Initialize as null

    if ('error' in summaryResult && typeof summaryResult.error === 'string') {
      summaryError = summaryResult.error;
    } else if (typeof summaryResult === 'object' && !('error' in summaryResult)) {
      summary = summaryResult as BaseFileSummary | JavaScriptFileSummary;
      summaryVector = await this.getContentEmbeddings(filepath, JSON.stringify(summary), "summary");
    } else {
      summaryError = "Unexpected summary result structure";
    }
    
    const contentVector = await this.getContentEmbeddings(filepath, content, "content");
    await this.sourcesRepository.insertSourceFile({
      projectName: this.projectName,
      filename,
      filepath,
      type,
      linesCount,
      summary: summary ?? null, 
      summaryError: summaryError ?? null, 
      summaryVector, // Will be null if summary failed or was not generated
      content,  
      contentVector,    
    });
  }

  /**
   * Get the embeddings vector for a piece of content, limiting the content's size if it is likely
   * to blow the LLM context window size.
   */
  private async getContentEmbeddings(filepath: string, content: string, type: string) {
    return await this.llmRouter.generateEmbeddings(filepath, content, {resource: filepath, type});      
  }




}


