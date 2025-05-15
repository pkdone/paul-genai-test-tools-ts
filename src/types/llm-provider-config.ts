/**
 * Types for LLM provider configurations.
 * These types represent the specific configuration required for each LLM provider.
 */

// TODO: remove this whole file?

import { ModelFamily } from "./llm-models-metadata";
import { LLMModelSet } from "./llm-types";

/**
 * Interface for base LLM provider configuration.
 */
export interface BaseLLMProviderConfig {
  readonly modelFamily: ModelFamily;
  readonly models: LLMModelSet;
}

/**
 * Interface for OpenAI provider configuration.
 */
export interface OpenAIProviderConfig extends BaseLLMProviderConfig {
  readonly apiKey: string;
}

/**
 * Interface for Azure OpenAI provider configuration.
 */
export interface AzureOpenAIProviderConfig extends BaseLLMProviderConfig {
  readonly apiKey: string;
  readonly endpoint: string;
  readonly embeddingsDeployment: string;
  readonly completionsDeploymentPrimary: string;
  readonly completionsDeploymentSecondary: string;
}

/**
 * Interface for VertexAI Gemini provider configuration.
 */
export interface VertexAIGeminiProviderConfig extends BaseLLMProviderConfig {
  readonly projectId: string;
  readonly location: string;
}

/**
 * Interface for AWS Bedrock provider configuration.
 * Base configuration for all Bedrock model families.
 */
export interface BedrockProviderConfig extends BaseLLMProviderConfig {
  readonly providerType: 'bedrock';  // Added to satisfy linter
  // Bedrock providers don't need additional configuration beyond models
  // AWS credentials are loaded from environment automatically
}

/**
 * Type for all LLM provider configurations.
 */
export type LLMProviderConfig = 
  | OpenAIProviderConfig 
  | AzureOpenAIProviderConfig 
  | VertexAIGeminiProviderConfig 
  | BedrockProviderConfig; 