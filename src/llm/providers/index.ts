/**
 * @deprecated This file is no longer used by LLMService which now auto-discovers provider manifests.
 * This manual registration approach has been replaced by automatic manifest discovery.
 * This file can be removed in a future version once all dependencies are updated.
 */

import { LLMProviderManifest } from "./llm-provider.types";
import { openAIProviderManifest } from "./openai/openai/openai.manifest";
import { azureOpenAIProviderManifest } from "./openai/azure-openai/azure-openai.manifest";
import { vertexAIGeminiProviderManifest } from "./vertexai/vertex-ai-gemini/vertex-ai-gemini.manifest";
import { bedrockTitanProviderManifest } from "./bedrock/bedrock-titan/bedrock-titan.manifest";
import { bedrockClaudeProviderManifest } from "./bedrock/bedrock-claude/bedrock-claude.manifest";
import { bedrockLlamaProviderManifest } from "./bedrock/bedrock-llama/bedrock-llama.manifest";
import { bedrockMistralProviderManifest } from "./bedrock/bedrock-mistral/bedrock-mistral.manifest";
import { bedrockNovaProviderManifest } from "./bedrock/bedrock-nova/bedrock-nova.manifest";
import { bedrockDeepseekProviderManifest } from "./bedrock/bedrock-deepseek/bedrock-deepseek.manifest";

/**
 * Array of all available provider manifests
 * @deprecated Use LLMService.create() which auto-discovers manifests instead
 */
export const XXallProviderManifests: LLMProviderManifest[] = [
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