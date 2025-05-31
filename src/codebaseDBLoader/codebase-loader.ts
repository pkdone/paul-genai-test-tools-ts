import { Collection, MongoClient } from "mongodb";
import LLMRouter from "../llm/llm-router";
import path from "path";
import databaseConfig from "../config/database.config";
import fileSystemConfig from "../config/fileSystem.config";
import promptsConfig from "../config/prompts.config";
import serverConfig from "../config/server.config";
import { readFile, buildDirDescendingListOfFiles } from "../utils/fs-utils";
import { getFileSuffix, transformJSToTSFilePath } from "../utils/path-utils";
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
    const db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    const colctn = db.collection(databaseConfig.SOURCES_COLLCTN_NAME);    
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

    await promiseAllThrottled(jobs, serverConfig.MAX_CONCURRENCY);
  }

  /**
   * Capture metadata for a file using the LLM.
   */
  private async captureSrcFileMetadataToCollection(colctn: Collection, fullFilepath: string) {    
    const type = getFileSuffix(fullFilepath).toLowerCase();
    const filepath = fullFilepath.replace(`${this.srcDirPath}/`, "");    
    if ((fileSystemConfig.BINARY_FILE_SUFFIX_IGNORE_LIST as readonly string[]).includes(type)) return;  // Skip file if it has binary content

    if ((this.ignoreIfAlreadyCaptured) && (await this.doesMetadataForFileExistsInDB(colctn, filepath))) {
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
  private async doesMetadataForFileExistsInDB(colctn: Collection, filepath: string) {
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
   * Invoke an LLM completion with a prompt to get a summary, returning the LLM's response as JSON.
   */
  private async getContentSummarisedAsJSON(filepath: string, type: string, content: string) {
    if (content.length <= 0) return { content: "<empty-file>" };     
    let promptFileName: string | undefined;
    
    if (path.basename(filepath).toUpperCase() === "README") {
      promptFileName = promptsConfig.MARKDOWN_FILE_SUMMARY_PROMPTS;
    } else {
      promptFileName = this.getSummaryPromptTemplateFileName(type);
    }

    promptFileName = promptFileName ?? promptsConfig.DEFAULT_FILE_SUMMARY_PROMPTS;
    let response;

    try {        
      const contentToReplaceList = [{ label: promptsConfig.PROMPT_CONTENT_BLOCK_LABEL, content }];
      const promptFilePath = transformJSToTSFilePath(__dirname, promptsConfig.PROMPTS_FOLDER_NAME, promptFileName);
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
  private getSummaryPromptTemplateFileName(type: string): string | undefined {
    // Check if the type exists as a key in the FILE_SUMMARY_PROMPTS
    if (Object.hasOwn(promptsConfig.FILE_SUMMARY_PROMPTS, type)) {
      // Use type assertion only after confirming the key exists
      return promptsConfig.FILE_SUMMARY_PROMPTS[type as keyof typeof promptsConfig.FILE_SUMMARY_PROMPTS];
    }
    
    return undefined;
  }
}

export default CodebaseToDBLoader;
