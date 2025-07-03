import { container, DependencyContainer } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/core/llm-service";
import LLMRouter from "../../llm/core/llm-router";
import { EnvVars } from "../../lifecycle/env.types";
import LLMStats from "../../llm/utils/routerTracking/llm-stats";
import { PromptAdapter } from "../../llm/utils/prompting/prompt-adapter";

/**
 * Registers the LLM router and its dependencies in the container.
 */
export function registerLLMServices(): void {
  // Register LLM utility classes
  container.registerSingleton(TOKENS.LLMStats, LLMStats);
  container.registerSingleton(TOKENS.PromptAdapter, PromptAdapter);

  // Register LLMService with an async factory
  container.register(TOKENS.LLMService, {
    useFactory: async (c: DependencyContainer) => {
      const modelFamily = c.resolve<string>(TOKENS.LLMModelFamily);
      const service = new LLMService(modelFamily);
      await service.initialize();
      console.log("LLM Service initialized via async factory");
      return service;
    },
  });

  // Register LLMRouter with an async factory that depends on LLMService
  container.register(TOKENS.LLMRouter, {
    useFactory: async (c: DependencyContainer) => {
      const llmService = await c.resolve<Promise<LLMService>>(TOKENS.LLMService);
      const envVars = c.resolve<EnvVars>(TOKENS.EnvVars);
      const llmStats = c.resolve<LLMStats>(TOKENS.LLMStats);
      const promptAdapter = c.resolve<PromptAdapter>(TOKENS.PromptAdapter);
      const router = new LLMRouter(llmService, envVars, llmStats, promptAdapter);
      console.log("LLM Router registered with async factory");
      return router;
    },
  });
}
