import { LLMProviderManifest } from "./llm-provider-manifest.types";
import { openAIProviderManifest } from "./openai/openai.provider";
import { azureOpenAIProviderManifest } from "./azure-openai/azure-openai.provider";
import { vertexAIGeminiProviderManifest } from "./vertex-ai-gemini/vertex-ai-gemini.provider";
import { bedrockTitanProviderManifest } from "./bedrock-titan/bedrock-titan.provider";
import { bedrockClaudeProviderManifest } from "./bedrock-claude/bedrock-claude.provider";
import { bedrockLlamaProviderManifest } from "./bedrock-llama/bedrock-llama.provider";
import { bedrockMistralProviderManifest } from "./bedrock-mistral/bedrock-mistral.provider";
import { bedrockNovaProviderManifest } from "./bedrock-nova/bedrock-nova.provider";
import { bedrockDeepseekProviderManifest } from "./bedrock-deepseek/bedrock-deepseek.provider";

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