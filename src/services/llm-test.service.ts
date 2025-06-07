import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import promptsConfig from "../config/prompts.config";
import { readFile } from "../utils/fs-utils";
import { LLMModelQuality } from "../types/llm.types";
import type LLMRouter from "../llm/llm-router";
import { Service } from "../types/service.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to test the LLM functionality.
 */
@injectable()
export class LLMTestService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
  ) {}

  /**
   * Execute the service - tests the LLM functionality.
   */
  async execute(): Promise<void> {
    await this.testLLMFunctionality();
  }

  /**
   * Tests the LLM functionality.
   */
  private async testLLMFunctionality(): Promise<void> {
    const prompt = await readFile(promptsConfig.SAMPLE_PROMPT_FILEPATH);
    console.log("\n---PROMPT---");
    console.log(prompt);
    
    // Test embeddings generation
    console.log("\n\n---EMBEDDINGS---");
    const embeddingsResult = await this.llmRouter.generateEmbeddings("hard-coded-test-input", prompt);
    console.log(embeddingsResult ?? "<empty>");
    
    // Test primary LLM completion
    console.log("\n\n---COMPLETION (Primary LLM)---");
    const completionPrimaryResult = await this.llmRouter.executeCompletion("hard-coded-test-input", 
                                      prompt, false, {}, LLMModelQuality.PRIMARY);
    console.log(completionPrimaryResult ?? "<empty>");
    
    // Test secondary LLM completion
    console.log("\n\n---COMPLETION (Secondary LLM)---");
    const completionSecondaryResult = await this.llmRouter.executeCompletion("hard-coded-test-input", 
                                        prompt, false, {}, LLMModelQuality.SECONDARY);
    console.log(completionSecondaryResult ?? "<empty>");
  }
} 