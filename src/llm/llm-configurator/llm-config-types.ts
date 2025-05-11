// filepath: /home/pdone/Projects/paul-genai-test-tools-ts/src/llm/llm-config-types.ts

/**
 * Base configuration interface for all LLM providers
 */
export interface BaseLLMConfig {
  modelFamily: string;
}

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends BaseLLMConfig {
  apiKey: string;
}

/**
 * Azure OpenAI-specific configuration
 */
export interface AzureOpenAIConfig extends BaseLLMConfig {
  apiKey: string;
  endpoint: string;
  embeddingsDeployment: string;
  primaryCompletionsDeployment: string;
  secondaryCompletionsDeployment: string;
}

/**
 * VertexAI Gemini-specific configuration
 */
export interface VertexAIGeminiConfig extends BaseLLMConfig {
  project: string;
  location: string;
}

/**
 * Bedrock base configuration - providers share the same initialization pattern
 */
export interface BedrockConfig extends BaseLLMConfig {
  // No additional configuration needed beyond model family
  // Adding a dummy property to avoid linter error for empty interface
  _type: 'bedrock';
}

// Type union of all possible LLM configurations
export type LLMConfig = 
  | OpenAIConfig 
  | AzureOpenAIConfig 
  | VertexAIGeminiConfig 
  | BedrockConfig;