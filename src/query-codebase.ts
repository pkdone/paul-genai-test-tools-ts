import { getTextLines } from "./utils/fs-utils";
import { getProjectNameFromPath } from "./utils/path-utils";
import CodeQuestioner from "./talkToCodebase/code-questioner";
import promptsConfig from "./config/prompts.config";
import { bootstrap } from "./lifecycle/bootstrap-startup";
import { setupGracefulShutdown } from "./lifecycle/graceful-shutdown";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";

/** 
 * Main function to run the program.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);

  let mongoDBClientFactory: MongoDBClientFactory | null = null;

  try {
    const { env, mongoClient, llmRouter, mongoDBClientFactory: factory } = await bootstrap();   
    mongoDBClientFactory = factory;
    setupGracefulShutdown(mongoDBClientFactory, llmRouter);    
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
    if (mongoDBClientFactory) await mongoDBClientFactory.closeAll();
  }

  console.log(`END: ${new Date().toISOString()}`);
  process.exit();  // Force exit because some LLM API libraries may have indefinite backgrounds tasks running  

}

main().catch(console.error);
