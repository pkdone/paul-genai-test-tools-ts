import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/llm-service";
import LLMRouter from "../../llm/llm-router";
import LLMStats from "../../llm/routerTracking/llm-stats";
import { PromptAdapter } from "../../llm/responseProcessing/llm-prompt-adapter";
import type { EnvVars } from "../../types/env.types";

/**
 * Register LLM-related dependencies.
 * Uses tsyringe's isRegistered check to prevent duplicate registrations.
 */
export async function registerLLMDependencies(envVars: EnvVars): Promise<void> {
  console.log('Registering LLM dependencies...');  
  
  if (!container.isRegistered(TOKENS.LLMService)) {
    // Register the model family string that LLMService depends on
    container.registerInstance(TOKENS.LLMModelFamily, envVars.LLM);
    
    // Register LLMService singleton - tsyringe will handle the injection
    container.registerSingleton(TOKENS.LLMService, LLMService);
    
    // Resolve and initialize the LLMService
    const llmService = container.resolve<LLMService>(TOKENS.LLMService);
    await llmService.initialize();
    console.log(`LLM Service initialized for model family: ${envVars.LLM}`);
    
    // Create and register LLMRouter with injected dependencies
    const llmProvider = llmService.getLLMProvider(envVars);
    const llmManifest = llmService.getLLMManifest();
    const retryConfig = llmManifest.providerSpecificConfig;
    
    // Resolve the dependencies that LLMRouter needs
    const llmStats = container.resolve<LLMStats>(TOKENS.LLMStats);
    const promptAdapter = container.resolve<PromptAdapter>(TOKENS.PromptAdapter);
    
    const llmRouter = new LLMRouter(llmProvider, llmStats, promptAdapter, retryConfig);
    container.registerInstance(TOKENS.LLMRouter, llmRouter);
    console.log('LLM Router initialized and registered as singleton');
  } else {
    console.log('LLM dependencies already registered - skipping registration');
  }
} 