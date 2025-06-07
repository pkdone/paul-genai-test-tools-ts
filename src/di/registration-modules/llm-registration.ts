import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/llm-service";
import LLMRouter from "../../llm/llm-router";
import type { EnvVars } from "../../types/env.types";

/**
 * Register LLM-related dependencies.
 * Uses tsyringe's isRegistered check to prevent duplicate registrations.
 */
export async function registerLLMDependencies(envVars: EnvVars): Promise<void> {
  console.log('Registering LLM dependencies...');  
  
  if (!container.isRegistered(TOKENS.LLMService)) {
    // Create and initialize LLM service singleton
    const llmService = new LLMService(envVars.LLM);
    await llmService.initialize();
    container.registerInstance(TOKENS.LLMService, llmService);
    console.log(`LLM Service initialized for model family: ${envVars.LLM}`);
    
    // Create LLM router singleton
    const llmProvider = llmService.getLLMProvider(envVars);
    const llmManifest = llmService.getLLMManifest();
    const retryConfig = llmManifest.providerSpecificConfig;
    const llmRouter = new LLMRouter(llmProvider, retryConfig);
    container.registerInstance(TOKENS.LLMRouter, llmRouter);
    console.log('LLM Router initialized and registered as singleton');
  } else {
    console.log('LLM dependencies already registered - skipping registration');
  }
} 