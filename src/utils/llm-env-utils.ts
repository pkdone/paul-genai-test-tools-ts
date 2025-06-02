import dotenv from "dotenv";
import { getLLMProviderManifest } from "../llm/llm-service";
import { EnvVars, baseEnvVarsSchema } from "../types/env.types";
import { z } from "zod";
import { BadConfigurationLLMError } from "../types/llm-errors.types";

/**
 * Utility function to get required environment variables with proper error handling.
 */
export function getRequiredLLMEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new BadConfigurationLLMError(`Required environment variable ${key} is not set`);
  return value;
}

/**
 * Utility function to load environment variables and validate them.
 * This function dynamically incorporates the Zod schema for environment variables specific to the
 * selected LLM provider.
 */

export async function loadEnvIncludingLLMVars(): Promise<EnvVars> {
  dotenv.config();
  // Schema to initially parse only the LLM selection variable
  const LlmSelectorSchema = z.object({ LLM: z.string().optional() });
  const rawEnv = process.env;

  // Initial parse to get the selected LLM provider name
  const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
  if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) throw new Error("LLM environment variable is not set or is empty in your .env file.");
  const selectedLlmModelFamily = selectedLlmContainer.data.LLM;

  // Load the manifest for the selected provider - getLLMProviderManifest will internally ensure
  // the llm-service is initialized
  const manifest = await getLLMProviderManifest(selectedLlmModelFamily);
  if (!manifest) throw new Error("No provider manifest found for LLM: '${selectedLlmModelFamily}");

  // Merge base schema with provider-specific schema from the manifest - the manifest.envSchema
  // defines variables specific to that LLM provider.
  const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();

  // Parse all environment variables with the combined schema
  const parsedEnv = finalSchema.parse(rawEnv);

  // Consistency check (LLM from .env vs modelFamily from manifest)
  if (parsedEnv.LLM !== manifest.modelFamily) {
    throw new Error(
      `Warning: LLM environment variable ('${parsedEnv.LLM}') does not precisely match ` +
      `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `
    );
  }

  return parsedEnv as EnvVars; // Zod's inference on finalSchema provides the actual shape
}
 