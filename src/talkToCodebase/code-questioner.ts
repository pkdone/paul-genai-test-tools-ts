import { MongoClient, Collection, Double } from "mongodb";
import LLMRouter from "../llm/llm-router";
import { databaseConfig, fileSystemConfig, promptsConfig } from "../config";
import { convertArrayOfNumbersToArrayOfDoubles } from "../mdb/mdb-utils";
import { logErrorMsgAndDetail } from "../utils/error-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";    
import { transformJSToTSFilePath } from "../utils/path-utils";
import { llmConfig } from "../config";

// Interface for source file record
interface SourceFileCodeMetadata {
  projectName: string;
  type: string;
  filepath: string;
  content: string;
}

/**
 * Provides ability to query the codebase, using Vector Search under the covers.
 */
export default class CodeQuestioner {
  // Private fields
  private readonly colctn: Collection<SourceFileCodeMetadata>;
  private readonly promptBuilder = new PromptBuilder();
  
  /**
   * Constructor.
   */
  constructor(readonly mongoClient: MongoClient, private readonly llmRouter: LLMRouter, private readonly projectName: string) { 
    this.colctn = mongoClient.db(databaseConfig.CODEBASE_DB_NAME).collection(databaseConfig.SOURCES_COLLCTN_NAME);
  }

  /**
   * Query the codebase, by first querying Vector Search and then using the results for RAG 
   * interacton with the LLM.
   */ 
  async queryCodebaseWithQuestion(question: string) {
    const queryVector = await this.llmRouter.generateEmbeddings("Human question", question);
    if (queryVector === null || queryVector.length <= 0) return "No vector was generated for the question - unable to answer question";
    const queryVectorDoubles = convertArrayOfNumbersToArrayOfDoubles(queryVector);  // HACK, see: https://jira.mongodb.org/browse/NODE-5714
    const bestMatchFiles = await this.findJavaCodeFileMatches(queryVectorDoubles);

    if (bestMatchFiles.length <= 0) {
      console.log("Vector search on code using the question failed to return any results");
      return "Unable to answer question because no relevent code was found";
    }

    const codeBlocksAsText = this.mergeSourceCodeFilesContentIntoMarkdownText(bestMatchFiles);
    const promptFilePath = transformJSToTSFilePath(__dirname, promptsConfig.PROMPTS_FOLDER_NAME, promptsConfig.CODEBASE_QUERY_PROMPT);
    const resourceName = `Codebase query using prompt from ${promptFilePath}`;
    const contentToReplaceList = [
      { label: promptsConfig.PROMPT_QUESTION_BLOCK_LABEL, content: question },
      { label: promptsConfig.PROMPT_CONTENT_BLOCK_LABEL, content: codeBlocksAsText },
    ];
    const prompt = await this.promptBuilder.buildPrompt(promptFilePath, contentToReplaceList);
    const response = await this.llmRouter.executeCompletion(promptFilePath, prompt, false, {resource: resourceName, requireJSON: false});      

    if (response) {
      const referencesText = bestMatchFiles.map(match => ` * ${match.filepath}`).join("\n");
      return `${typeof response === "string" ? response : JSON.stringify(response)}\n\nReferences:\n${referencesText}`;
    } else {
      console.log("Called the LLN with some data returned by Vector Search but the LLM returned an empty response");
      return "Unable to answer question because no insight was generated";
    }
  }

  /**
   * Find best matching Java Code Files for a given vectorized code question.
   */
  private async findJavaCodeFileMatches(queryVector: Double[]) {
    const pipeline = [
      {$vectorSearch: {
        index: databaseConfig.CONTENT_VECTOR_INDEX_NAME,
        path: databaseConfig.CONTENT_VECTOR_INDEX,
        filter: {
          $and: [
            {projectName: { $eq: this.projectName} },
            {type: { $eq: fileSystemConfig.JAVA_FILE_TYPE} },
          ],
        },
        queryVector: queryVector,
        numCandidates: llmConfig.VECTOR_SEARCH_NUM_CANDIDATES,
        limit: llmConfig.VECTOR_SEARCH_NUM_LIMIT,
      }},

      {$project: {
        _id: 0,
        filepath: 1,
        type: 1,
        content: 1
      }},
    ];

    try {
      return await this.colctn.aggregate<SourceFileCodeMetadata>(pipeline).toArray();  
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Problem performing Atlas Vector Search aggregation - ensure the vector index is defined for the '${databaseConfig.SOURCES_COLLCTN_NAME}' collection`, error);    
      throw error;
    }
  }


  //
  // Turns a list of content of source code file and their respective filetypes and produces one 
  // piece of text using Markdown code-block syntax to delinante the content of each source file.
  //
  private mergeSourceCodeFilesContentIntoMarkdownText(sourceFileMetadataList: SourceFileCodeMetadata[]) {
    const markdownParts: string[] = [];

    for (const fileMetadata of sourceFileMetadataList) {
      markdownParts.push(`${promptsConfig.CODE_BLOCK_MARKDOWN}${fileMetadata.type}\n${fileMetadata.content}\n${promptsConfig.CODE_BLOCK_MARKDOWN}\n\n`);
    }

    return markdownParts.join("");
  }
}



