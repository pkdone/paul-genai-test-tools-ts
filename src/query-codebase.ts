import { getTextLines } from "./utils/fs-utils";
import { getProjectNameFromPath } from "./utils/path-utils";
import mongoDBService from "./utils/mongodb-service";
import CodeQuestioner from "./talkToCodebase/code-questioner";
import promptsConfig from "./config/prompts.config";
import { bootstrap } from "./env/bootstrap";

/** 
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);

  try {
    const { env, mongoClient, llmRouter } = await bootstrap();   
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Performing vector search then invoking LLM for optimal results for for project: ${projectName}`);
    const codeQuestioner = new CodeQuestioner(mongoClient, llmRouter, projectName);
    const questions = await getTextLines(promptsConfig.QUESTIONS_PROMPTS_FILEPATH);

    for (const question of questions) {
      const result = await codeQuestioner.queryCodebaseWithQuestion(question);
      console.log(`\n---------------\nQUESTION: ${question}\n\n${result}\n---------------\n`);          
    }

    await llmRouter.close();  
  } finally {
    await mongoDBService.closeAll();
  }

  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  

}

main().catch(console.error);
