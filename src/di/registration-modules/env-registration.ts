import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { EnvVars } from "../../app/env.types";
import { LLMService } from "../../llm/core/llm-service";
import { loadBaseEnvVarsOnly } from "../../app/env";
import { z } from "zod";
import { baseEnvVarsSchema } from "../../app/env.types";
import { BadConfigurationLLMError } from "../../llm/utils/llm-errors.types";
import { getErrorStack } from "../../common/utils/error-utils";
import { getProjectNameFromPath } from "../../common/utils/path-utils";
import dotenv from "dotenv";

/**
 * Register environment variables based on requirements.
 * Uses conditional registration with tsyringe's isRegistered check to prevent duplicates.
 */
export async function registerEnvDependencies(requiresLLM: boolean): Promise<void> {
  // Check if EnvVars is already registered
  if (!container.isRegistered(TOKENS.EnvVars)) {
    const envVars = await loadEnvironmentVars(requiresLLM);
    container.registerInstance(TOKENS.EnvVars, envVars);
    console.log('Environment variables loaded and registered as singleton');
  } else {
    console.log('Environment variables already registered - skipping registration');
  }

  // Register ProjectName derived from CODEBASE_DIR_PATH
  if (!container.isRegistered(TOKENS.ProjectName)) {
    const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);
    const projectName = getProjectNameFromPath(envVars.CODEBASE_DIR_PATH);
    container.registerInstance(TOKENS.ProjectName, projectName);
    console.log(`Project name '${projectName}' derived and registered as singleton`);
  } else {
    console.log('Project name already registered - skipping registration');
  }
}

/**
 * Load environment variables based on whether LLM is required.
 */
async function loadEnvironmentVars(requiresLLM: boolean): Promise<EnvVars> {
  if (requiresLLM) {
    return await loadEnvIncludingLLMVars();
  } else {
    return loadBaseEnvVarsOnly();
  }
}

/**
 * Load environment variables including LLM-specific ones.
 */
async function loadEnvIncludingLLMVars(): Promise<EnvVars> {
    try {
      dotenv.config();
      const LlmSelectorSchema = z.object({ LLM: z.string().optional() });
      const rawEnv = process.env;
      const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
      if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) {
        throw new Error("LLM environment variable is not set or is empty in your .env file.");
      }
      const selectedLlmModelFamily = selectedLlmContainer.data.LLM;
      const manifest = await LLMService.loadManifestForModelFamily(selectedLlmModelFamily);
      const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();
      const parsedEnv = finalSchema.parse(rawEnv);

      if (parsedEnv.LLM !== manifest.modelFamily) {
        throw new BadConfigurationLLMError(
          `Warning: LLM environment variable ('${parsedEnv.LLM}') does not precisely match ` +
          `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `
        );
      }

      return parsedEnv as EnvVars;
    } catch (error) {
      if (error instanceof BadConfigurationLLMError) throw error;
      
      if (error instanceof z.ZodError) {
        const missingEnvVars = error.issues
          .filter(issue => issue.code === 'invalid_type' && issue.received === 'undefined')
          .map(issue => issue.path.join('.'));
        
        if (missingEnvVars.length > 0) {
          const selectedLlmModelFamily = process.env.LLM ?? 'unknown';
          throw new BadConfigurationLLMError(
            `Missing required environment variables for ${selectedLlmModelFamily} provider: ${missingEnvVars.join(', ')}. ` +
            `Please add these variables to your .env file. See EXAMPLE.env for guidance on provider-specific variables.`
          );
        }
      }
      
      throw new BadConfigurationLLMError("Failed to load and validate environment variables for LLM configuration", getErrorStack(error));
    }
} 