import path from "path";
import appConst from "./types/app-constants";
import envConst from "./types/env-constants";
import { LLMModelQuality } from "./types/llm-types";
import { readFile, writeFile, clearDirectory, readDirContents, getFileSuffix } from "./utils/fs-utils";
import { promiseAllThrottled } from "./utils/control-utils";
import { getEnvVar } from "./utils/envvar-utils";
import { logErrorMsgAndDetail, getErrorText } from "./utils/error-utils";
import LLMRouter from "./llm/llm-router";

/**
 * Main function to run the program.
 */
async function main(): Promise<void> {
  console.log(`START: ${new Date()}`);
  const srcDirPath = getEnvVar<string>(envConst.ENV_CODEBASE_DIR_PATH).replace(/\/$/, "");
  const filepaths = await buildDirDescendingListOfFiles(srcDirPath);
  const llmProvider = getEnvVar<string>(envConst.ENV_LLM);
  const llmRouter = new LLMRouter(llmProvider, getEnvVar<boolean>(envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
  llmRouter.displayLLMStatusSummary();
  const result = await mergeSourceFilesAndAskQuestionsOfItToAnLLM(llmRouter, filepaths, srcDirPath);
  await clearDirectory(appConst.OUTPUT_DIR);  
  const outputFilePath = path.join(__dirname, "..", appConst.OUTPUT_DIR, appConst.OUTPUT_SUMMARY_FILE);
  await writeFile(outputFilePath, `-- ${llmProvider} --\n${result}`); 
  llmRouter.displayLLMStatusDetails();
  await llmRouter.close();
  console.log(`View generared results at: file://${outputFilePath}`);
  console.log(`END: ${new Date()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  
}

/**
 * Build the list of files descending from a directory 
 */
async function buildDirDescendingListOfFiles(srcDirPath: string): Promise<string[]> {
  const files = [];
  const queue: string[] = [srcDirPath];

  while (queue?.length) {
    const directory = queue.shift();
    if (!directory) continue;

    try {
      const entries = await readDirContents(directory);

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!appConst.FOLDER_IGNORE_LIST.includes(entry.name)) {
            queue.push(fullPath);
          }
        } else if (entry.isFile()) {
          if (!entry.name.toLowerCase().startsWith(appConst.FILENAME_PREFIX_IGNORE)) {
            files.push(fullPath);
          } 
        }
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to read directory: ${directory}`, error);
    }
  }

  return files;
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
    if (appConst.BINARY_FILE_SUFFIX_IGNORE_LIST.includes(type)) continue; // Skip file if it has binary content
    const content = await readFile(filepath);
    mergedContent += "\n``` " + relativeFilepath + "\n" + content.trim() + "\n```\n";
  }

  return mergedContent;
}

/**
 * Execute a prompt against a codebase and return the LLM's response.
 */
async function executePromptAgainstCodebase(prompt: TemplatePrompt, codeBlocksContents: string, llmRouter: LLMRouter): Promise<string> {
  const resource = prompt.key;
  const context = { resource };
  const promptFirstPart = `${PROMPT_PREFIX} ${prompt.question} ${PROMPT_SUFFIX}`;
  const fullPrompt = `${promptFirstPart}\n${codeBlocksContents}`;
  let response = "";

  try {
    response = await llmRouter.executeCompletion(resource, fullPrompt, LLMModelQuality.REGULAR_PLUS, false, context) as string;
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
    key: "KEY-IMPROVEMNTS",
    question:
`Identify the top 10 key areas to improve the code in terms of clarity, conciseness, following
Javascript best practices, and ensuring the code is maintainable and scalable.`,
  },
  {
    key: "BAD-COMMENTS",
    question:
`Identify the top 10 class/function comments which are innacurate or missing.`,
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
    key: "MISSING_TYPES",
    question:
`Identifiy any parts of the codebase that are missing TypeScript types for function parameters, 
return values, or variables.`,
  },    
  {
    key: "MISSING_SEMICOLONS",
    question:
`Identifiy any statements in the code which are missing a final semi-colon.`,
  },    

  {
    key: "MISSING_SEMICOLONS",
    question:
`Identifiy any statements in the code which are missing a final semi-colon.`,
  },
];

// Alternate Prompts
/*
const PROMPT_PREFIX_ALT = `Act as a programmer analyzing the code in a legacy application where the 
content of each file in the application's codebase is shown below in a code block.`;
const PROMPT_SUFFIX_ALT = ``;
const PROMPTS_ALT: TemplatePrompt[] = [
  {
    key: "DETAILED-DESCRIPTION",
    question:
`Provide a detailed description outlining the software application's purpose and implementation.
`,
  },
  {
    key: "BUSINESS-PROCESSES",
    question:
`Provide a list of the inherent business processes (a collection tasks to achieve a business goal 
for the user or the system) that exist across the software applications's codebase.
`
  },
  {
    key: "EXTERNAL-TECHNOLOGIES",
    question:
`Provide a list of the key external and host platform technologies depended on by the application, 
each with a name plus and a description.
`
  },
  {
    key: "DATABASE-INTERACTIONS",
    question:
`Provide a list the files in the application's code that interacts with an external databaase, and 
for each interaction, state the mechanism the code uses to invoke the database and a description 
of what that database interaction does (e.g., inserts a new person record, queries stock, etc.).

Note, examples of types of database interactions application can employs are:
    - Code uses a JDBC driver or JDBC API (specify mechanism as: 'JDBC')
    - Code contains SQL code (specify mechanism as: 'SQL')
    - Code uses a database driver or library (specify mechanism as: 'DRIVER')
    - Code uses a database Object-Relational-Mapper (ORM) like JPA, TopLink, Hibernate, etc, (specify mechanism as: 'ORM')
    - Code uses a Spring Data API (specify mechanism as: 'SPRING-DATA')
    - Code has a Java class integrating with a database by an Enterprise Java Bean (EJB), which also could be CMP or BMP based (specify mechanism as: 'EJB')
    - Code uses a 3rd party framework/library for database access (specify mechanism as: 'OTHER')
    - Otherwise, if the code does not use a database, then specify mechanism as: 'NONE'
    (note, JMS and JNDI are not related to interacting with a dataase)
`
  },
  {
    key: "MICROSERVICES",
    question:
`The existing application is a monolith, but the application needs to be modernized to a new
microservices-based architecture. Analyze the existing application's monolithic structure and make
a recommendation on what the new set of new loosely coupled microservices should be to replace the
monolith while still providing all the same user functionality for the application as before. In
your recommendations, list your suggested names and descriptions of each microservice and outline
the set of CRUD operations that each microservice should implement as a REST API. When identifying 
the microservices, ensure you adhere to the "Single Responsibility Principle" for each microservice:
"gather together in a microservice those things that change for the same reason and separate those
things that change for different reasons into different microservices.”
`
  },
];
*/

// Bootstrap
(async () => {
  await main();
})();

