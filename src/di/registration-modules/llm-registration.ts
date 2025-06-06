import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/llm-service";
import LLMRouter from "../../llm/llm-router";
import type { EnvVars } from "../../types/env.types";

/**
 * Register LLM-related dependencies.
 */
export async function registerLLMDependencies(envVars: EnvVars): Promise<void> {
  console.log('Registering LLM dependencies...');  
  const llmService = new LLMService(envVars.LLM);
  await llmService.initialize();
  container.registerInstance(TOKENS.LLMService, llmService);  
  const llmProvider = llmService.getLLMProvider(envVars);
  const llmManifest = llmService.getLLMManifest();
  const retryConfig = llmManifest.providerSpecificConfig;
  const llmRouter = new LLMRouter(llmProvider, retryConfig);
  container.registerInstance(TOKENS.LLMRouter, llmRouter);
} 