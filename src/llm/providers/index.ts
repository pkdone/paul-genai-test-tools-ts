import { LLMProviderManifest } from "./llm-provider-manifest.types";
import { openAIProviderManifest } from "./openai/openai/openai.provider";
import { azureOpenAIProviderManifest } from "./openai/azure-openai/azure-openai.provider";
import { vertexAIGeminiProviderManifest } from "./vertexai/vertex-ai-gemini/vertex-ai-gemini.provider";
import { bedrockTitanProviderManifest } from "./bedrock/bedrock-titan/bedrock-titan.provider";
import { bedrockClaudeProviderManifest } from "./bedrock/bedrock-claude/bedrock-claude.provider";
import { bedrockLlamaProviderManifest } from "./bedrock/bedrock-llama/bedrock-llama.provider";
import { bedrockMistralProviderManifest } from "./bedrock/bedrock-mistral/bedrock-mistral.provider";
import { bedrockNovaProviderManifest } from "./bedrock/bedrock-nova/bedrock-nova.provider";
import { bedrockDeepseekProviderManifest } from "./bedrock/bedrock-deepseek/bedrock-deepseek.provider";

/**
 * Array of all available provider manifests
 */
export const allProviderManifests: LLMProviderManifest[] = [
  openAIProviderManifest,
  azureOpenAIProviderManifest,
  vertexAIGeminiProviderManifest,
  bedrockTitanProviderManifest,
  bedrockClaudeProviderManifest,
  bedrockLlamaProviderManifest,
  bedrockMistralProviderManifest,
  bedrockNovaProviderManifest,
  bedrockDeepseekProviderManifest,
]; 