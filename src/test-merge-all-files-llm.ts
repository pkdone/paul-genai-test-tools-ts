import path from "path";
import appConst from "./types/app-constants";
import envConst from "./types/env-constants";
import { getEnvVar } from "./utils/envvar-utils";
import { readFile, writeFile, clearDirectory, readDirContents, getFileSuffix } from "./utils/basics-utils";
import { promiseAllThrottled } from "./utils/control-utils";
import LLMRouter from "./llm/llm-router";
import { LLMModelSize } from "./types/llm-types";


/**
 * Type to define the key and question of template prompt to ask an LLM
 */ 
type TemplatePrompt = {
  key: string;
  question: string;
};


/**
 * Main function to run the program.
 */
async function main(): Promise<void> {
  console.log(`START: ${new Date()}`);
  const srcDirPath = getEnvVar<string>(envConst.ENV_CODEBASE_DIR_PATH).replace(/\/$/, "");
  const filepaths = await buildDirDescendingListOfFiles(srcDirPath);
  const llmRouter = new LLMRouter(getEnvVar(envConst.ENV_LLM), getEnvVar(envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
  llmRouter.displayLLMStatusSummary();
  const result = await mergeSourceFilesAndAskQuestionsOfItToAnLLM(llmRouter, filepaths, srcDirPath);
  await clearDirectory(appConst.OUTPUT_DIR);  
  const outputFilePath = path.join(__dirname, "..", appConst.OUTPUT_DIR, appConst.OUTPUT_SUMMARY_FILE);
  await writeFile(outputFilePath, result); 
  console.log(`View generared results at: file://${outputFilePath}`);
  llmRouter.displayLLMStatusDetails();
  await llmRouter.close();
  console.log(`END: ${new Date()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  
}


/**
 * Function to build the list of files descending from a directory 
 */
async function buildDirDescendingListOfFiles(srcDirPath: string): Promise<string[]> {
  const files = [];
  const queue: string[] = [srcDirPath];

  while (queue?.length) {
    const directory = queue.shift();
    if (!directory) continue;

    try {
      let entries = await readDirContents(directory);

      for (const entry of entries) {
        let fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!appConst.FOLDER_IGNORE_LIST.includes(entry.name)) {
            queue.push(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      const baseError = error as Error;
      console.error(`Failed to read directory: ${directory}`, baseError, baseError.stack);    
    }
  }

  return files;
}


/**
 * Function to merge the content of all source files and ask questions of it to an LLM
 */
async function mergeSourceFilesAndAskQuestionsOfItToAnLLM(llmRouter: LLMRouter, filepaths: string[], srcDirPath: string) {
  let mergedContent = "";

  for (const filepath of filepaths) {
    const relativeFilepath = filepath.replace(srcDirPath + "/", "");
    const type = getFileSuffix(filepath).toLowerCase();
    if (appConst.BINARY_FILE_SUFFIX_IGNORE_LIST.includes(type)) continue;  // Skip file if it has binary content
    const content = await readFile(filepath);
    mergedContent += "\n``` " + relativeFilepath + "\n" + content.trim() + "\n```\n";
  }

  const jobs = [];
  
  for (const prompt of PROMPTS) {
    jobs.push(async () => executePromptAgainstCodebase(prompt, mergedContent, llmRouter));    
  }

  const jobResults = await promiseAllThrottled<string>(jobs, appConst.MAX_CONCURRENCY);
  return jobResults.reduce((mergedResults: string, result: string) => mergedResults + result, "");
}


/**
 * Function to execute a prompt against a codebase and return the result.
 */
async function executePromptAgainstCodebase(prompt: TemplatePrompt, content: string, llmRouter: LLMRouter): Promise<string> {
  const resource = prompt.key;
  const context = { resource };
  const promptWithPrefix = `${PROMPT_PREFIX}${prompt.question}`;
  const fullPrompt = `${promptWithPrefix}${content}`;
  let response = "";

  try {
    response = await llmRouter.executeCompletion(resource, fullPrompt, LLMModelSize.SMALL_PLUS, false, context) as string;
  } catch (error) {
    const baseError = error as Error;
    console.error("Problem introspecting and processing source files", baseError, baseError.stack);    
    response = baseError.message;
  } 

  return `\n< ${prompt.key}\n${promptWithPrefix}>\n\n${response}\n==========================================================\n\n`;
}


// Prompts
const PROMPT_PREFIX = `Act as a programmer analyzing the code in a legacy application where the 
content of each file in the application's codebase is shown below in a code block. `;
const PROMPTS: TemplatePrompt[] = [
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
for the user or the system) that exist across the software applications's codebase,
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


// Bootstrap
(async () => {
  await main();
})();

