import { injectable, inject } from "tsyringe";
import type LLMRouter from "../llm/llm-router";
import { fileSystemConfig, promptsConfig, llmConfig } from "../config";
import { convertArrayOfNumbersToArrayOfDoubles } from "../mdb/mdb-utils";
import { PromptBuilder } from "../promptTemplating/prompt-builder";    
import { transformJSToTSFilePath } from "../utils/path-utils";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import type { SourceFileShortInfo } from "../repositories/models/source.model";
import { TOKENS } from "../di/tokens";

/**
 * Provides ability to query the codebase, using Vector Search under the covers.
 */
@injectable()
export default class CodeQuestioner {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.PromptBuilder) private readonly promptBuilder: PromptBuilder
  ) { 
  }

  /**
   * Query the codebase, by first querying Vector Search and then using the results for RAG 
   * interacton with the LLM.
   */ 
  async queryCodebaseWithQuestion(question: string, projectName: string) {
    const queryVector = await this.llmRouter.generateEmbeddings("Human question", question);
    if (queryVector === null || queryVector.length <= 0) return "No vector was generated for the question - unable to answer question";
    const queryVectorDoubles = convertArrayOfNumbersToArrayOfDoubles(queryVector);  // HACK, see: https://jira.mongodb.org/browse/NODE-5714
    const bestMatchFiles = await this.sourcesRepository.vectorSearchContent(
      projectName,
      fileSystemConfig.JAVA_FILE_TYPE,
      queryVectorDoubles,
      llmConfig.VECTOR_SEARCH_NUM_CANDIDATES,
      llmConfig.VECTOR_SEARCH_NUM_LIMIT
    );

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
   * Turns a list of content of source code file and their respective filetypes and produces one 
   * piece of text using Markdown code-block syntax to delinante the content of each source file.
   */
  private mergeSourceCodeFilesContentIntoMarkdownText(sourceFileMetadataList: SourceFileShortInfo[]) {
    const markdownParts: string[] = [];

    for (const fileMetadata of sourceFileMetadataList) {
      markdownParts.push(`${promptsConfig.CODE_BLOCK_MARKDOWN}${fileMetadata.type}\n${fileMetadata.content}\n${promptsConfig.CODE_BLOCK_MARKDOWN}\n\n`);
    }

    return markdownParts.join("");
  }
}



