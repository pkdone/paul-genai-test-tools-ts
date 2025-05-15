import path from "path";
import fs from "fs";
import appConst from "./env/app-consts";
import { readFile, writeFile, clearDirectory, getFileSuffix, buildDirDescendingListOfFiles, readDirContents }
       from "./utils/fs-utils";
import { promiseAllThrottled } from "./utils/control-utils";
import { logErrorMsgAndDetail, getErrorText } from "./utils/error-utils";
import LLMRouter from "./llm/llm-router";
import { bootstrapJustLLM } from "./env/bootstrap";

/**
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);
  const { env, llmRouter } = bootstrapJustLLM();   
  const srcDirPath = env.CODEBASE_DIR_PATH.replace(/\/$/, "");
  const filepaths = await buildDirDescendingListOfFiles(srcDirPath);
  llmRouter.displayLLMStatusSummary();
  const prompts = await loadPrompts();
  await clearDirectory(appConst.OUTPUT_DIR);  
  await processSourceFilesWithPrompts(llmRouter, filepaths, srcDirPath, prompts, env.LLM);
  llmRouter.displayLLMStatusDetails();
  await llmRouter.close();
  console.log(`View generated results in the '${appConst.OUTPUT_DIR}' folder`);
  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  
}

/**
 * Process source files with prompts and write individual output files.
 */
async function processSourceFilesWithPrompts(llmRouter: LLMRouter, filepaths: string[], 
                                             srcDirPath: string, prompts: FileRequirementPrompt[], 
                                             llmName: string) {
  const codeBlocksContent = await mergeSourceFilesContent(filepaths, srcDirPath);
  const jobs = [];
  
  for (const prompt of prompts) {
    jobs.push(async () => {
      const result = await executePromptAgainstCodebase(prompt, codeBlocksContent, llmRouter);
      const outputFileName = `${prompt.filename}.result`;
      const outputFilePath = path.join(__dirname, "..", appConst.OUTPUT_DIR, outputFileName);
      await writeFile(outputFilePath, 
        `GENERATED-BY: ${llmName}\n\nREQUIREMENT: ${prompt.question}\n\nRECOMENDATIONS:\n\n${result.trim()}\n`);
      return outputFilePath;
    });    
  }

  return await promiseAllThrottled<string>(jobs, appConst.MAX_CONCURRENCY);
}

/**
 * Merge the content of all source files.
 */
async function mergeSourceFilesContent(filepaths: string[], srcDirPath: string) {
  let mergedContent = "";

  for (const filepath of filepaths) {
    const relativeFilepath = filepath.replace(`${srcDirPath}/`, "");    
    const type = getFileSuffix(filepath).toLowerCase();
    if (appConst.BINARY_FILE_SUFFIX_IGNORE_LIST.includes(type as typeof appConst.BINARY_FILE_SUFFIX_IGNORE_LIST[number])) continue; // Skip file if it has binary content
    const content = await readFile(filepath);
    mergedContent += "\n``` " + relativeFilepath + "\n" + content.trim() + "\n```\n";
  }

  return mergedContent.trim();
}

/**
 * Execute a prompt against a codebase and return the LLM's response.
 */
async function executePromptAgainstCodebase(prompt: FileRequirementPrompt, codeBlocksContents: string, llmRouter: LLMRouter) {
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

/**
 * Load prompts from files in the input folder
 */
async function loadPrompts() {
  const inputDir = appConst.REQUIREMENTS_PROMPTS_FOLDERPATH;
  const prompts: FileRequirementPrompt[] = [];
  
  try {
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
    const files = await readDirContents(inputDir);
    const promptFiles = files.filter(file => appConst.REQS_FILE_REGEX.exec(file.name) !== null);
    
    for (const file of promptFiles) {
      const filePath = path.join(inputDir, file.name);
      const content = await readFile(filePath);
      prompts.push({
        filename: file.name.replace('.prompt', ''),
        question: content.trim()
      });
    }
  } catch (error) {
    logErrorMsgAndDetail("Problem loading prompts from input folder", error);
  }
  
  return prompts;
}

// Type to define the filename and question of a file requirement prompt
interface FileRequirementPrompt {
  filename: string;
  question: string;
}

main().catch(console.error);
