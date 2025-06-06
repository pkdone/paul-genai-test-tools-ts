import databaseConfig from "../config/database.config";
import { MongoDBClientFactory } from "../utils/mongodb-client-factory";
import LLMRouter from "../llm/llm-router";
import { LLMService } from "../llm/llm-service";
import dotenv from "dotenv";
import { z } from "zod";
import { baseEnvVarsSchema } from "../types/env.types";
import { ServiceRunnerConfig } from "../types/service.types";
import { MongoClient } from 'mongodb';
import { EnvVars } from "../types/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { getErrorStack } from "../utils/error-utils";

/**
 * Unified bootstrap result that contains all possible dependencies.
 */
export interface BootstrapResult {
  env: EnvVars;
  mongoClient?: MongoClient;
  llmRouter?: LLMRouter;
  mongoDBClientFactory?: MongoDBClientFactory;
  llmService?: LLMService;
}

/**
 * Comprehensive bootstrap function that initializes resources based on service requirements.
 * This replaces the multiple bootstrapWith... functions with a single unified approach.
 */
export async function bootstraper(config: ServiceRunnerConfig): Promise<BootstrapResult> {
  const result: BootstrapResult = {} as BootstrapResult;

  if (config.requiresLLM) {
    const llmService = new LLMService();
    await llmService.initialize();
    result.env = loadEnvIncludingLLMVars(llmService);
    const llmProvider = llmService.getLLMProvider(result.env);
    const llmManifest = llmService.getLLMManifest(result.env.LLM);
    const retryConfig = llmManifest?.providerSpecificConfig;
    result.llmRouter = new LLMRouter(llmProvider, retryConfig);
    result.llmService = llmService;
  } else {
    result.env = loadBaseEnvVarsOnly();
  }

  if (config.requiresMongoDB) {
    const mongoDBClientFactory = new MongoDBClientFactory();
    const mongoClient = await mongoDBClientFactory.connect(databaseConfig.DEFAULT_MONGO_SVC, result.env.MONGODB_URL);
    result.mongoClient = mongoClient;
    result.mongoDBClientFactory = mongoDBClientFactory;
  }

  return result;
}

/**
 * Utility function to load only base environment variables and validate them.
 */
export function loadBaseEnvVarsOnly(): z.infer<typeof baseEnvVarsSchema> {
  dotenv.config();
  const rawEnv = process.env;
  const parsedEnv = baseEnvVarsSchema.parse(rawEnv);
  return parsedEnv;
}

/**
 * Utility function to load environment variables and validate them.
 * This function dynamically incorporates the Zod schema for environment variables specific to the
 * selected LLM provider.
 */
function loadEnvIncludingLLMVars(llmService: LLMService): EnvVars {
  try {
    dotenv.config();
    // Schema to initially parse only the LLM selection variable
    const LlmSelectorSchema = z.object({ LLM: z.string().optional() });
    const rawEnv = process.env;

    // Initial parse to get the selected LLM provider name
    const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
    if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) throw new Error("LLM environment variable is not set or is empty in your .env file.");
    const selectedLlmModelFamily = selectedLlmContainer.data.LLM;

    // Load the manifest for the selected provider using the provided service instance
    const manifest = llmService.getLLMManifest(selectedLlmModelFamily);
    if (!manifest) throw new Error("No provider manifest found for LLM: '${selectedLlmModelFamily}");

    // Merge base schema with provider-specific schema from the manifest - the manifest.envSchema
    // defines variables specific to that LLM provider.
    const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();

    // Parse all environment variables with the combined schema
    const parsedEnv = finalSchema.parse(rawEnv);

    // Consistency check (LLM from .env vs modelFamily from manifest)
    if (parsedEnv.LLM !== manifest.modelFamily) {
      throw new BadConfigurationLLMError(
        `Warning: LLM environment variable ('${parsedEnv.LLM}') does not precisely match ` +
        `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `
      );
    }

    return parsedEnv as EnvVars; // Zod's inference on finalSchema provides the actual shape
  } catch (error) {
    if (error instanceof BadConfigurationLLMError) throw error; // Re-throw if correct error type
    throw new BadConfigurationLLMError("Failed to load and validate environment variables for LLM configuration", getErrorStack(error));
  }
}
