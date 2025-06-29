import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/core/llm-service";
import LLMRouter from "../../llm/core/llm-router";
import LLMStats from "../../llm/utils/routerTracking/llm-stats";
import { PromptAdapter } from "../../llm/utils/responseProcessing/llm-prompt-adapter";
import type { EnvVars } from "../../app/env.types";

/**
 * Register LLM-related dependencies using a more declarative approach.
 * Uses async factories to handle initialization without resolving dependencies immediately.
 * This function is async to match the bootstrap interface, though async work happens in factories.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function registerLLMDependencies(envVars: EnvVars): Promise<void> {
  if (container.isRegistered(TOKENS.LLMRouter)) {
    console.log('LLM dependencies already registered - skipping registration');
    return;
  }

  // Register utility classes that LLM dependencies need
  container.registerSingleton(TOKENS.LLMStats, LLMStats);
  container.registerSingleton(TOKENS.PromptAdapter, PromptAdapter);
  
  // Register the model family and environment variables as instances
  container.registerInstance(TOKENS.LLMModelFamily, envVars.LLM);
  container.registerInstance(TOKENS.EnvVars, envVars);

  // Use an async factory for LLMService to handle its initialization
  container.register(TOKENS.LLMService, {
    useFactory: async (c) => {
      const modelFamily = c.resolve<string>(TOKENS.LLMModelFamily);
      const service = new LLMService(modelFamily);
      await service.initialize();
      console.log("LLM Service initialized via async factory");
      return service;
    },
  });

  // Register LLMRouter with an async factory to properly handle the async LLMService dependency
  container.register(TOKENS.LLMRouter, {
    useFactory: async (c) => {
      const llmService = await c.resolve<Promise<LLMService>>(TOKENS.LLMService);
      const envVars = c.resolve<EnvVars>(TOKENS.EnvVars);
      const llmStats = c.resolve<LLMStats>(TOKENS.LLMStats);
      const promptAdapter = c.resolve<PromptAdapter>(TOKENS.PromptAdapter);
      
      return new LLMRouter(llmService, envVars, llmStats, promptAdapter);
    },
  });
  console.log('LLM Router registered with async factory');
} 