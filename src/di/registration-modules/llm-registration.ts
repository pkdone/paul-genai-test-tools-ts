import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/llm-service";
import LLMRouter from "../../llm/llm-router";
import LLMStats from "../../llm/routerTracking/llm-stats";
import { PromptAdapter } from "../../llm/responseProcessing/llm-prompt-adapter";
import { LLMCandidateFunction, LLMModelQuality } from "../../types/llm.types";
import type { EnvVars } from "../../types/env.types";

/**
 * Register LLM-related dependencies.
 * Uses tsyringe's isRegistered check to prevent duplicate registrations.
 */
export async function registerLLMDependencies(envVars: EnvVars): Promise<void> {
  // Register utility classes that LLM dependencies need
  if (!container.isRegistered(TOKENS.LLMStats)) {
    container.registerSingleton(TOKENS.LLMStats, LLMStats);
  }
  if (!container.isRegistered(TOKENS.PromptAdapter)) {
    container.registerSingleton(TOKENS.PromptAdapter, PromptAdapter);
  }
  
  if (!container.isRegistered(TOKENS.LLMService)) {
    // Register the model family string that LLMService depends on
    container.registerInstance(TOKENS.LLMModelFamily, envVars.LLM);
    
    // Register LLMService singleton - tsyringe will handle the injection
    container.registerSingleton(TOKENS.LLMService, LLMService);
    
    // Resolve and initialize the LLMService
    const llmService = container.resolve<LLMService>(TOKENS.LLMService);
    await llmService.initialize();
    console.log("LLM Service registered as singleton");
    
    // Create and register LLMRouter dependencies
    const llmProvider = llmService.getLLMProvider(envVars);
    const llmManifest = llmService.getLLMManifest();
    const retryConfig = llmManifest.providerSpecificConfig;
    
    // Configure completion candidates in order of preference
    const completionCandidates: LLMCandidateFunction[] = [];
    
    // Add primary completion model as first candidate
    completionCandidates.push({
      func: llmProvider.executeCompletionPrimary,
      modelQuality: LLMModelQuality.PRIMARY,
      description: "Primary completion model"
    });
    
    // Add secondary completion model as fallback if available
    const availableQualities = llmProvider.getAvailableCompletionModelQualities();
    if (availableQualities.includes(LLMModelQuality.SECONDARY)) {
      completionCandidates.push({
        func: llmProvider.executeCompletionSecondary,
        modelQuality: LLMModelQuality.SECONDARY,
        description: "Secondary completion model (fallback)"
      });
    }
    
    // Register the dynamic dependencies as instances
    container.registerInstance(TOKENS.LLMProvider, llmProvider);
    container.registerInstance(TOKENS.CompletionCandidates, completionCandidates);
    container.registerInstance(TOKENS.RetryConfig, retryConfig);

    // Now register LLMRouter as a singleton class - tsyringe will handle dependency injection
    container.registerSingleton(TOKENS.LLMRouter, LLMRouter);
    console.log('LLM Router registered as singleton');
  } else {
    console.log('LLM dependencies already registered - skipping registration');
  }
} 