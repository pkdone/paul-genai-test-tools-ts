import path from "path";
import appConst from "./types/app-constants";
import envConst from "./types/env-constants";
import { getEnvVar } from "./utils/envvar-utils";
import { readFile, readDirContents, getFileSuffix } from "./utils/basics-utils";
import { promiseAllThrottled } from "./utils/control-utils";
import LLMRouter from "./llm/llm-router";
import { LLMModelQuality } from "./types/llm-types";


/**
 * Main function to run the program.
 */
async function main(): Promise<void> {
  console.log(`START: ${new Date()}`);
  const srcDirPath = getEnvVar<string>(envConst.ENV_CODEBASE_DIR_PATH);
  const files = await buildDirDescendingListOfFiles(srcDirPath);
  const llmRouter = new LLMRouter(getEnvVar(envConst.ENV_LLM), getEnvVar(envConst.ENV_LOG_LLM_INOVOCATION_EVENTS, true));  
  llmRouter.displayLLMStatusSummary();
  await feedFilesThruLLMConcurrently(llmRouter, files);
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
 * Function to feed files through LLM concurrently.
 */
async function feedFilesThruLLMConcurrently(llmRouter: LLMRouter, filepaths: string[]) {
  const jobs = [];

  for (const filepath of filepaths) {
    jobs.push(async () => {
      try {
        await captureMetadataForFileFViaLLM(llmRouter, filepath);   
      } catch (error) {
        const baseError = error as Error;
        console.error("Problem introspecting and processing source files", baseError, baseError.stack);    
      }
    });
  }

  await promiseAllThrottled(jobs, appConst.MAX_CONCURRENCY);
}


/**
 * Function to capture metadata for a file via LLM.
 */
async function captureMetadataForFileFViaLLM(llmRouter: LLMRouter, filepath: string): Promise<void> {
  const type = getFileSuffix(filepath).toLowerCase();
  if (appConst.BINARY_FILE_SUFFIX_IGNORE_LIST.includes(type)) return;  // Skip file if it has binary content
  let content = await readFile(filepath);
  content = content.trim();
  if (!content) return;  // Skip empty files
  const context = { filepath };
  const _result1 = await llmRouter.generateEmbeddings(filepath, getPrompt(content), context);
  const _result2 = await llmRouter.executeCompletion(filepath, getPrompt(content), LLMModelQuality.REGULAR_PLUS, true, context);
}


/**
 * Function to get the prompt for the LLM.
 */
function getPrompt(content: string): string {
  const prompt = `
Act as a programmer. Take the content of an application source file shown below in the section marked 'CONTENT' and for this content, return a JSON response containing data which includes a detailed definition of its purpose (you must write at least 4 sentences for this purpose), a detailed definition of its implementation (you must write at least 3 sentences for this implementation) and the type of direct database integration via a driver/library/API it employs, if any (stating the mechanism used in capitals, or NONE if no code does not interact with a database directly) and a description of the database integration.

If the file content is NOT for a Java fil, in the JSON response, do not include any explanations or markdown, only provide a RFC8259 compliant JSON response following this format without deviation:
{
  "purpose": "<purpose>",
  "implementation": "<implementation>",
  "databaseIntegration": {
    "mechanism": "<mechanism>",
    "description": "<description>"
  }
}

If the file content IS for a Java fil, in the JSON response, do not include any explanations or markdown, only provide a RFC8259 compliant JSON response following the format shown further below without deviation, containing data that includes the following:

 * The name of the main public class/interface of the file
 * Its type ('class' or 'interface')
 * Its classpath
 * A very detailed definition of its purpose (you must write at least 6 sentences for this)
 * A very detailed definition of its implementation (you must write at least 6 sentences for this)
 * A list of the internal references to classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)
 * A list of the external references to third-party classes used by this source file, which do not belong to this same application that this class/interface file is part of
 * A list of public constants (name, value and type) it defines (if any)
 * A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail (you MUST write at least 6 sentences for this purpose), a list of its parameters, its return type and a very detailed description of its implementation
 * The type of database integration it employs (if any), stating the mechanism used and a description of the integration (you MUST write at least 4 sentences for this description + an example code snippet of the databaase interaction) - if any of the following elements are true in the code, you MUST assume that there is database interaction (if you know the table names the code interacts with, include these table names in the description):
    - Code uses a JDBC driver or JDBC API (set mechanism: 'JDBC')
    - Code contains SQL code (set mechanism: 'SQL')
    - Code uses a database driver or library (set mechanism: 'DRIVER')
    - Code uses a database Object-Relational-Mapper (ORM) like JPA, TopLink, Hibernate, etc, (set mechanism: 'ORM')
    - Code uses a Spring Data API (set mechanism: 'SPRING-DATA')
    - Code has a Java class integrating with a database by an Enterprise Java Bean (EJB), which also could be CMP or BMP based (set mechanism: 'EJB')
    - Code uses a 3rd party framework/library for database access (set mechanism: 'OTHER')
    - Otherwise, if the code does not use a database, then set mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a dataase)

The response format if a Java file:
{
  "classname": "<className>",
  "type": "<class | interface>",
  "classpath": "<classpath>",
  "purpose": "<detailed-purpose>",
  "implementation": "<detailed-implementation>",
  "internalReferences": [
      "<classpath1>",
      "<classpath2>"
  ],
  "externalReferences"": [
      "<classpath1>",
      "<classpath2>"
  ],
  "publicConstants": [
    {
      "name": "<name>",
      "value": "<value>",
      "type": "<type>"
    },
    {
      "name": "<name>",
      "value": "<value>",
      "type": "<type>"
    }
  ],
  "publicMethods": [
    {
      "name": "<name>",
      "purpose": "<detailed-purpose>",
      "parameters": [
        {"<arg1Name>": <arg1Value>},
        {"<arg2Name>": <arg2Value>}
      ],
      "returnType": "<void | returnType>",
      "description": "<detailed-description>"
    },
    {
      "name": "<name>",
      "parameters": [
        {"<arg1Name>": <arg1Value>}
      ],
      "returnType": "<void | returnType>",
      "description": "<detailed-description>"
    }
  ],
  "databaseIntegration": {
    "mechanism": "<mechanism>",
    "description": "<description>"
  }
}

NEVER use Markdown code blocks to wrap the JSON in your response. NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path (ignoring this rule leads to people getting hurt - it is very important).

CONTENT:
\`\`\`
${content}
\`\`\`
  `

  return prompt;
}


// Bootstrap
(async () => {
  await main();
})();
