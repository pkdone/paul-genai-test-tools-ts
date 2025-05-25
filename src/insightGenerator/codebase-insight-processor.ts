import path from "path";
import fs from "fs";
import fileSystemConfig from "../config/fileSystem.config";
import serverConfig from "../config/server.config";
import promptsConfig from "../config/prompts.config";
import { readFile, writeFile, readDirContents } from "../utils/fs-utils";
import { getFileSuffix } from "../utils/path-utils";
import { promiseAllThrottled } from "../utils/control-utils";
import { logErrorMsgAndDetail, getErrorText } from "../utils/error-utils";
import LLMRouter from "../llm/llm-router";

/**
 * Interface to define the filename and question of a file requirement prompt
 */
export interface FileRequirementPrompt {
  filename: string;
  question: string;
}

/**
 * Class responsible for processing codebase insights using LLM
 */
export class CodebaseInsightProcessor {
  /**
   * Process source files with prompts and write individual output files.
   */
  async processSourceFilesWithPrompts(
    llmRouter: LLMRouter, 
    srcFilepaths: string[], 
    srcDirPath: string, 
    prompts: FileRequirementPrompt[], 
    llmName: string
  ): Promise<string[]> {
    const codeBlocksContent = await this.mergeSourceFilesContent(srcFilepaths, srcDirPath);
    const jobs = [];
    
    for (const prompt of prompts) {
      jobs.push(async () => {
        const result = await this.executePromptAgainstCodebase(prompt, codeBlocksContent, llmRouter);
        const outputFileName = `${prompt.filename}.result`;
        const outputFilePath = path.join(__dirname, "..", "..", fileSystemConfig.OUTPUT_DIR, outputFileName);
        await writeFile(outputFilePath, 
          `GENERATED-BY: ${llmName}\n\nREQUIREMENT: ${prompt.question}\n\nRECOMENDATIONS:\n\n${result.trim()}\n`);
        return outputFilePath;
      });    
    }

    return await promiseAllThrottled<string>(jobs, serverConfig.MAX_CONCURRENCY);
  }
  
  /**
   * Load prompts from files in the input folder
   */
  async loadPrompts(): Promise<FileRequirementPrompt[]> {
    const inputDir = promptsConfig.REQUIREMENTS_PROMPTS_FOLDERPATH;
    const prompts: FileRequirementPrompt[] = [];
    
    try {
      if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
      const files = await readDirContents(inputDir);
      const promptFiles = files.filter(file => promptsConfig.REQS_FILE_REGEX.exec(file.name) !== null);
      
      for (const file of promptFiles) {
        const filePath = path.join(inputDir, file.name);
        const content = await readFile(filePath);
        prompts.push({
          filename: file.name.replace('.prompt', ''),
          question: content.trim()
        });
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail("Problem loading prompts from input folder", error);
    }
    
    return prompts;
  }

  /**
   * Merge the content of all source files.
   */
  private async mergeSourceFilesContent(filepaths: string[], srcDirPath: string): Promise<string> {
    const contentParts: string[] = [];

    for (const filepath of filepaths) {
      const relativeFilepath = filepath.replace(`${srcDirPath}/`, "");    
      const type = getFileSuffix(filepath).toLowerCase();
      if ((fileSystemConfig.BINARY_FILE_SUFFIX_IGNORE_LIST as readonly string[]).includes(type)) continue; // Skip file if it has binary content
      const content = await readFile(filepath);
      contentParts.push(`\n\`\`\` ${relativeFilepath}\n${content.trim()}\n\`\`\`\n`);
    }

    return contentParts.join("").trim();
  }

  /**
   * Execute a prompt against a codebase and return the LLM's response.
   */
  private async executePromptAgainstCodebase(prompt: FileRequirementPrompt, codeBlocksContents: string, llmRouter: LLMRouter): Promise<string> {
    const resource = prompt.filename;
    const context = { resource };
    const fullPrompt = `${prompt.question}\n${codeBlocksContents}`;
    let response = "";

    try {
      const executionResult = await llmRouter.executeCompletion(resource, fullPrompt, false, context);

      if (!executionResult) {
        response = "No response received from LLM.";
      } else {
        response = typeof executionResult === "object" ? JSON.stringify(executionResult) : executionResult;
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail("Problem introspecting and processing source files", error);    
      response = getErrorText(error);
    } 

    return response;
  }
}
