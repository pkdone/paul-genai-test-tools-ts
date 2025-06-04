import { getTextLines } from "./utils/fs-utils";
import { getProjectNameFromPath } from "./utils/path-utils";
import CodeQuestioner from "./talkToCodebase/code-questioner";
import promptsConfig from "./config/prompts.config";
import { bootstrapStartup } from "./lifecycle/bootstrap-startup";
import { MongoDBClientFactory } from "./utils/mongodb-client-factory";
import { gracefulShutdown } from "./lifecycle/graceful-shutdown";
import LLMRouter from "./llm/llm-router";

/** 
 * Main function to run the program.
 */
async function main() {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;

  try {
    const { env, mongoClient, llmRouter: router, mongoDBClientFactory: factory } = await bootstrapStartup();   
    mongoDBClientFactory = factory;
    llmRouter = router;
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    console.log(`Performing vector search then invoking LLM for optimal results for for project: ${projectName}`);
    const codeQuestioner = new CodeQuestioner(mongoClient, llmRouter, projectName);
    const questions = await getTextLines(promptsConfig.QUESTIONS_PROMPTS_FILEPATH);

    for (const question of questions) {
      const result = await codeQuestioner.queryCodebaseWithQuestion(question);
      console.log(`\n---------------\nQUESTION: ${question}\n\n${result}\n---------------\n`);          
    }
  } finally {
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

main().catch(console.error);
