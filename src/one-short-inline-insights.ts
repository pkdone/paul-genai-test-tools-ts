import path from "path";
import appConst from "./env/app-consts";
import { readFile, writeFile, clearDirectory, getFileSuffix, buildDirDescendingListOfFiles }
       from "./utils/fs-utils";
import { promiseAllThrottled } from "./utils/control-utils";
import { logErrorMsgAndDetail, getErrorText } from "./utils/error-utils";
import LLMRouter from "./llm/llm-router";
import { loadEnvVars } from "./env/env-vars";

/**
 * Main function to run the program.
 */
async function main()
 {
  console.log(`START: ${new Date().toISOString()}`);
  const env = loadEnvVars();
  const srcDirPath = env.CODEBASE_DIR_PATH.replace(/\/$/, "");
  const filepaths = await buildDirDescendingListOfFiles(srcDirPath);
  const llmProvider = env.LLM;
  const llmRouter = new LLMRouter(llmProvider);  
  llmRouter.displayLLMStatusSummary();
  const result = await mergeSourceFilesAndAskQuestionsOfItToAnLLM(llmRouter, filepaths, srcDirPath);
  await clearDirectory(appConst.OUTPUT_DIR);  
  const outputFilePath = path.join(__dirname, "..", appConst.OUTPUT_DIR, appConst.OUTPUT_SUMMARY_FILE);
  await writeFile(outputFilePath, `-- ${llmProvider} --\n${result}`); 
  llmRouter.displayLLMStatusDetails();
  await llmRouter.close();
  console.log(`View generared results at: file://${outputFilePath}`);
  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  
}

/**
 * Merge the content of all source files and ask questions against it to an LLM
 */
async function mergeSourceFilesAndAskQuestionsOfItToAnLLM(llmRouter: LLMRouter, filepaths: string[], srcDirPath: string) {
  const codeBlocksContent = await mergeSourceFilesContent(filepaths, srcDirPath);
  const jobs = [];
  
  for (const prompt of PROMPTS) {
    jobs.push(async () => executePromptAgainstCodebase(prompt, codeBlocksContent, llmRouter));    
  }

  const jobResults = await promiseAllThrottled<string>(jobs, appConst.MAX_CONCURRENCY);
  return jobResults.reduce((mergedResults: string, result: string) => mergedResults + result, "");
}

/**
 * Merge the content of all source files.
 */
async function mergeSourceFilesContent(filepaths: string[], srcDirPath: string) {
  let mergedContent = "";

  for (const filepath of filepaths) {
    const relativeFilepath = filepath.replace(srcDirPath + "/", "");
    const type = getFileSuffix(filepath).toLowerCase();
    if (appConst.BINARY_FILE_SUFFIX_IGNORE_LIST.includes(type as typeof appConst.BINARY_FILE_SUFFIX_IGNORE_LIST[number])) continue; // Skip file if it has binary content
    const content = await readFile(filepath);
    mergedContent += "\n``` " + relativeFilepath + "\n" + content.trim() + "\n```\n";
  }

  return mergedContent;
}

/**
 * Execute a prompt against a codebase and return the LLM's response.
 */
async function executePromptAgainstCodebase(prompt: TemplatePrompt, codeBlocksContents: string, llmRouter: LLMRouter) {
  const resource = prompt.key;
  const context = { resource };
  const promptFirstPart = `${PROMPT_PREFIX} ${prompt.question} ${PROMPT_SUFFIX}`;
  const fullPrompt = `${promptFirstPart}\n${codeBlocksContents}`;
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

  return `\n< ${prompt.key}\n${promptFirstPart}>\n\n${response}\n==========================================================\n\n`;
}

/**
 * Type to define the key and question of template prompt to ask an LLM
 */ 
interface TemplatePrompt {
  key: string;
  question: string;
}

// Prompts
const PROMPT_PREFIX = `Act as a programmer analyzing the code in a TypeScript application where the 
content of each file in the application's codebase is shown below in a code block.`;
const PROMPT_SUFFIX = `Provide references to the specific part(s) of the code that needs 
improvement with suggestions on how to improve.`;
const PROMPTS: TemplatePrompt[] = [
  {
    key: "ARCHITECTURE-IMPROVEMENTS",
    question:
`Identify a couple of key sub-optimal apsects of the software's architecture that would benefit from
 structual change to improve the clarity of the project and ease of maintenance and subsequent
change. Provide a brief description of the current state and a suggestion for improvement.`,
  },
  {
    key: "KEY-IMPROVEMNTS",
    question:
`Identify the top 10 key areas to improve the code in terms of clarity, conciseness, following
Javascript best practices, and ensuring the code is maintainable and scalable.`,
  },
  {
    key: "MODERN-JAVASCRIPT",
    question:
`Identify any bits of code which aren't fully leveraging the capabilities of the more modern aspects
of newer versions of JavaScript up to the 14th Edition of ECMAScript (ECMAScript 2023) and the newer
 versions of TypeScroipt (if there is ambiguity, favor TypeScript over JavaScript).`,
  },  
  {
    key: "BAD-PRACTICE",
    question:
`Identify any bits of code that aren't leveraging 'const' or even 'readonly' rather then 'let' for
 variable declarations, when they could be.`,
  },    
  {
    key: "CODE-ORGANIZATION",
    question:
`Identify what parts of the codebase are not well-organized, and highlight which files contain
 multiple unrelated functions.`,
  },    
  {
    key: "CODE-CONSISTENCY",
    question:
`Identify what parts of the codebase use an inconsistent coding style, such as different
indentation levels and variable naming conventions.`,
  },    
  {
    key: "ANY-USE",
    question:
`Identify what parts of the may use of TypeScript \`any\` where there is an option to use more 
strongly typed code.`,
  },    
  {
    key: "FUNCTIONAL-PROG",
    question:
`Identify places in the code which use for or while loops where instead an Array functions map(), 
reduce(), filter(), or find() could be used instead to provide a cleaner more functional 
programming style solution.`,
  },    
  {
    key: "MISSING-TYPES",
    question:
`Identifiy any parts of the codebase that are missing TypeScript types for function parameters, 
 or variables.`,
  },    
  {
    key: "MISSING-SEMICOLONS",
    question:
`Identifiy any statements in the code which are missing a final semi-colon.`,
  },    
  {
    key: "MONOLITH-TO-MICROSERVICES",
    question:
`The existing application is a monolith, but the application needs to be modernized to a new
microservices-based architecture. Analyze the existing application's monolithic structure and make
a recommendation on what the new set of new loosely coupled microservices should be to replace the
monolith while still providing all the same user functionality for the application as before. In
your recommendations, list your suggested names and descriptions of each microservice and outline
the set of CRUD operations that each microservice should implement as a REST API. When identifying 
the microservices, ensure you adhere to the "Single Responsibility Principle" for each microservice:
"gather together in a microservice those things that change for the same reason and separate those
things that change for different reasons into different microservices.`,
  },    
];

// Bootstrap
main().catch(console.error);

