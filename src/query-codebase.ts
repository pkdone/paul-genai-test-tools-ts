import { getProjectNameFromPath, getTextLines } from "./utils/fs-utils";
import mongoDBService from "./utils/mongodb-service";
import LLMRouter from "./llm/llm-router";
import { loadEnvVars } from "./env/env-vars";
import CodeQuestioner from "./talkToCodebase/code-questioner";
import appConst from "./env/app-consts";

/** 
 * Main app runner to query a codebase, using the RAG pattern of first finding likely revelant
 * content using a vector database of source code embeddings (Atlas Vector Search) and then
 * augmenting the prompt with this content, asking it to answer the question with this context.
 */
async function main() {
  console.log(`START: ${new Date().toISOString()}`);

  try {
    const env = loadEnvVars();
    const srcDirPath = env.CODEBASE_DIR_PATH;
    const projectName = getProjectNameFromPath(srcDirPath);     
    const llmProvider = env.LLM;
    const mdbURL = env.MONGODB_URL; 
    console.log(`Performing vector search then invoking LLM for optimal results for for project: ${projectName}`);
    const mongoClient = await mongoDBService.connect("default", mdbURL);
    const llmRouter = new LLMRouter(llmProvider);  
    const codeQuestioner = new CodeQuestioner(mongoClient, llmRouter, projectName);
    const questions = await getTextLines(appConst.QUESTIONS_PROMPTS_FILEPATH);

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

// Bootstrap
main().catch(console.error);
