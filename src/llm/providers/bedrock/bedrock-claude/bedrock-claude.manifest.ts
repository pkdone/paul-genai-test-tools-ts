import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../../types/llm-types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";

// Exported model key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35";
export const AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37";
export const AWS_COMPLETIONS_CLAUDE_V40 = "AWS_COMPLETIONS_CLAUDE_V40";

/**
 *  AWS_COMPLETIONS_CLAUDE_V35: According to Anthropic site, the 'maxCompletionsTokens' should be
 *  8192 but Bedrock seems to cut this short to usually 4095 or 4096 but have seen 4090 reported for
 *  some LLM responses, so using a few tokens buffer to come up with a limit of 4088
 *
 *  AWS_COMPLETIONS_CLAUDE_V37: Bedrock seems to be limiting the max model tokens to 132k and
 */

export const bedrockClaudeProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Claude",
  modelFamily: "BedrockClaude",
  envVarNames: [], // Bedrock uses AWS credentials from environment or IAM roles
  models: {
    embeddings: {
      key: AWS_EMBEDDINGS_TITAN_V1,
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      key: AWS_COMPLETIONS_CLAUDE_V37,
      urn: "anthropic.claude-3-opus-20240229-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4088,
      maxTotalTokens: 132000, 
    },
    secondaryCompletion: {
      key: AWS_COMPLETIONS_CLAUDE_V40,
      urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4088,
      maxTotalTokens: 200000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelSet, modelsMetadata, errorPatterns) => {
    return new BedrockClaudeLLM(modelSet, modelsMetadata, errorPatterns);
  },
}; 