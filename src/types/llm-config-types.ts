/**
 * Enum for LLM provider types
 */
export enum LLMProviderType {
  OPENAI = 'openai',
  AZURE = 'azure',
  VERTEX = 'vertex',
  BEDROCK = 'bedrock'
}

/**
 * Enum for Bedrock variants
 */
export enum BedrockVariantType {
  TITAN = 'titan',
  CLAUDE = 'claude',
  LLAMA = 'llama',
  MISTRAL = 'mistral',
  NOVA = 'nova',
  DEEPSEEK = 'deepseek'
}

/**
 * Base interface for LLM provider configurations
 */
export interface LLMProviderConfig {
  llmProviderType: LLMProviderType;
}

/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig extends LLMProviderConfig {
  llmProviderType: LLMProviderType.OPENAI;
  apiKey: string;
}

/**
 * Azure OpenAI provider configuration
 */
export interface AzureOpenAIConfig extends LLMProviderConfig {
  llmProviderType: LLMProviderType.AZURE;
  apiKey: string;
  apiEndpoint: string;
  embeddingsModel: string;
  completionsModelPrimary: string;
  completionsModelSecondary: string;
}

/**
 * VertexAI Gemini provider configuration
 */
export interface VertexAIGeminiConfig extends LLMProviderConfig {
  llmProviderType: LLMProviderType.VERTEX;
  projectId: string;
  location: string;
}

/**
 * AWS Bedrock provider configuration (base)
 */
export interface BedrockConfig extends LLMProviderConfig {
  llmProviderType: LLMProviderType.BEDROCK;
  variant: BedrockVariantType;
}

/**
 * Union type for all LLM provider configurations
 */
export type LLMConfig = 
  | OpenAIConfig 
  | AzureOpenAIConfig 
  | VertexAIGeminiConfig 
  | BedrockConfig; 