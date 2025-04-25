import { Collection, MongoClient } from "mongodb";
import LLMRouter from "../llm/llm-router";
import path from "path";
import appConst from "../env/app-consts";
import { readFile, getFileSuffix, transformJSToTSFilePath, buildDirDescendingListOfFiles } 
       from "../utils/fs-utils";
import { countLines } from "../utils/text-utils";
import { promiseAllThrottled } from "../utils/control-utils";
import { logErrorMsgAndDetail, getErrorText } from "../utils/error-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";    

/** 
 * Loads each source file into a class to represent it.
 */
class CodebaseToDBLoader {
  // Private fields
  private readonly promptBuilder = new PromptBuilder();
  private doneCheckingAlreadyCapturedFiles = false;
  
  /**
   * Constructor.
   */
  constructor(private readonly mongoClient: MongoClient, private readonly llmRouter: LLMRouter,
              private readonly projectName: string, private readonly srcDirPath: string, 
              private readonly ignoreIfAlreadyCaptured: boolean) {}

  /**
   * Generate the set of representations of source files including each one's content and metadata.
   */
  async loadIntoDB() {
    const srcFilepaths = await buildDirDescendingListOfFiles(this.srcDirPath);
    await this.insertSourceContentIntoDB(srcFilepaths);
  }

  /**
   * Loops through a list of file paths, loads each file's content, and prints the content.
   */
  private async insertSourceContentIntoDB(filepaths: string[]) {
    const db = this.mongoClient.db(appConst.CODEBASE_DB_NAME);
    const colctn = db.collection(appConst.SOURCES_COLLCTN_NAME);    
    console.log(`Creating metadata for ${filepaths.length} files to the MongoDB database collection: '${db.databaseName}.${colctn.collectionName}'`);
    
    if (!this.ignoreIfAlreadyCaptured) {
      console.log(`Deleteing older version of the project's metadata files from the database to enable the metadata to be re-generated - change env var 'IGNORE_ALREADY_PROCESSED_FILES' to avoid re-processing of all files`);
      await colctn.deleteMany({projectName: this.projectName});
    }

    const jobs = [];

    for (const filepath of filepaths) {
      jobs.push(async () => {
        try {
          await this.captureSrcFileMetadataToCollection(colctn, filepath);   
        } catch (error: unknown) {
          logErrorMsgAndDetail(`Problem introspecting and processing source file: ${filepath}`, error);    
        }
      });
    }

    await promiseAllThrottled(jobs, appConst.MAX_CONCURRENCY);
  }

  /**
   * Capture metadata for a file using the LLM.
   */
  private async captureSrcFileMetadataToCollection(colctn: Collection, fullFilepath: string) {    
    const type = getFileSuffix(fullFilepath).toLowerCase();
    const filepath = fullFilepath.replace(`${this.srcDirPath}/`, "");    
    if (appConst.BINARY_FILE_SUFFIX_IGNORE_LIST.includes(type as typeof appConst.BINARY_FILE_SUFFIX_IGNORE_LIST[number])) return;  // Skip file if it has binary content

    if ((this.ignoreIfAlreadyCaptured) && (await this.doesMedataForFileExistsInDB(colctn, filepath))) {
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
    const summary = await this.getContentSummarisedAsJSON(filepath, type, content);
    const summaryVector = await this.getContentEmbeddings(filepath, JSON.stringify(summary), "summary");
    const contentVector = await this.getContentEmbeddings(filepath, content, "content")
    await colctn.insertOne({
      projectName: this.projectName,
      filename,
      filepath,
      type,
      linesCount,
      summary,
      summaryVector,
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

  /**
   * QUery the DB `sources` collection for existence of a record with matching filepath field for 
   * this project.
   */
  private async doesMedataForFileExistsInDB(colctn: Collection, filepath: string) {
    const query = { 
      projectName: this.projectName, 
      filepath,
    };
    const options = {
      projection: { _id: 1 },
    };
    return await colctn.findOne(query, options);
  }

  /**
   * Invoke an LLM completion with a prompt to get a symmary, returning the LLM's response as JSON.
   */
  private async getContentSummarisedAsJSON(filepath: string, type: string, content: string) {
    // If file is in markdown or is the README, just use its content as-is as its summary
    if (type === "md" || path.basename(filepath).toUpperCase() === "README") return { content };
    if (content.length <= 0) return { content: "<empty-file>" }; 
    
    let promptFileName = this.getSummaryPromptTemplateFileName(type);
    
    if (path.basename(filepath).toUpperCase() === "README") {
      promptFileName = appConst.MARKDOWN_FILE_SUMMARY_PROMPTS;
    } else {
      promptFileName ??= appConst.DEFAULT_FILE_SUMMARY_PROMPTS;
    }

    let response;

    try {        
      const contentToReplaceList = [{ label: appConst.PROMPT_CONTENT_BLOCK_LABEL, content }];
      const promptFilePath = transformJSToTSFilePath(__dirname, appConst.PROMPTS_FOLDER_NAME, promptFileName);
      const prompt = await this.promptBuilder.buildPrompt(promptFilePath, contentToReplaceList);
      response = await this.llmRouter.executeCompletion(filepath, prompt, true, {resource: filepath, requireJSON: true});      
    } catch (error: unknown) {
      logErrorMsgAndDetail(`No summary generated for file '${filepath}' due to processing error`, error);
      response = {error: getErrorText(error)};
    }

    return response;
  }

  /**
   * Helper function to get the summary template prompt file name based on the file type.
   */
  private getSummaryPromptTemplateFileName(type: string): string | null {
    return Object.hasOwn(appConst.FILE_SUMMARY_PROMPTS, type)
      ? appConst.FILE_SUMMARY_PROMPTS[type as keyof typeof appConst.FILE_SUMMARY_PROMPTS]
      : null;
  }
}

export default CodebaseToDBLoader;
