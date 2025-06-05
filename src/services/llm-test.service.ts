import promptsConfig from "../config/prompts.config";
import { readFile } from "../utils/fs-utils";
import { LLMModelQuality } from "../types/llm.types";
import LLMRouter from "../llm/llm-router";

/**
 * Service to test the LLM functionality.
 */
export class LLMTestService {
  /**
   * Constructor.
   */
  constructor(
    private readonly llmRouter: LLMRouter
  ) {}

  /**
   * Tests the LLM functionality.
   */
  async testLLMFunctionality(): Promise<void> {
    this.llmRouter.displayLLMStatusSummary();
    const prompt = await readFile(promptsConfig.SAMPLE_PROMPT_FILEPATH);
    console.log("\n---PROMPT---");
    console.log(prompt);
    
    // Test embeddings generation
    console.log("\n\n---EMBEDDINGS---");
    const embeddingsResult = await this.llmRouter.generateEmbeddings("hard-coded-test-input", prompt);
    console.log(embeddingsResult ?? "<empty>");
    
    // Test primary LLM completion
    console.log("\n\n---COMPLETION (Primary LLM)---");
    const completionPrimaryResult = await this.llmRouter.executeCompletion(
      "hard-coded-test-input", 
      prompt, 
      false, 
      {}, 
      LLMModelQuality.PRIMARY
    );
    console.log(completionPrimaryResult ?? "<empty>");
    
    // Test secondary LLM completion
    console.log("\n\n---COMPLETION (Secondary LLM)---");
    const completionSecondaryResult = await this.llmRouter.executeCompletion(
      "hard-coded-test-input", 
      prompt, 
      false, 
      {}, 
      LLMModelQuality.SECONDARY
    );
    console.log(completionSecondaryResult ?? "<empty>");
  }
} 