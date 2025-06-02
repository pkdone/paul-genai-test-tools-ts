import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { getRequiredLLMEnv } from "../../../../utils/llm-env-utils";

// Environment variable name constants
const BEDROCK_EMBEDDINGS_MODEL_KEY = "BEDROCK_EMBEDDINGS_MODEL";
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_CLAUDE = "BedrockClaude";
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";
export const AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35";
export const AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37";
export const AWS_COMPLETIONS_CLAUDE_V40 = "AWS_COMPLETIONS_CLAUDE_V40";

/**
 * AWS_COMPLETIONS_CLAUDE_V35: According to Anthropic site, the 'maxCompletionsTokens' should be
 * 8192 but Bedrock seems to cut this short to usually 4095 or 4096 but have seen 4090 reported for
 * some LLM responses, so using a few tokens buffer to come up with a limit of 4088
 *
 * AWS_COMPLETIONS_CLAUDE_V40: Bedrock seems to be limiting the max model response tokens to around
 * 39k when it should be 64k, and when its over 39k an "overloaded" response is always returned.
 */

export const bedrockClaudeProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Claude",
  modelFamily: BEDROCK_CLAUDE,
  envSchema: z.object({
    [BEDROCK_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      internalKey: AWS_EMBEDDINGS_TITAN_V1,
      urn: getRequiredLLMEnv(BEDROCK_EMBEDDINGS_MODEL_KEY),
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      internalKey: AWS_COMPLETIONS_CLAUDE_V40,
      urn: getRequiredLLMEnv(BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 32768,  // Should be 64k but errors if larger than around 39200
      maxTotalTokens: 200000,
    },
    secondaryCompletion: {
      internalKey: AWS_COMPLETIONS_CLAUDE_V37,
      urn: getRequiredLLMEnv(BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65536,
      maxTotalTokens: 200000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  factory: (_envConfig, modelsInternallKeySet, modelsMetadata, errorPatterns) => {
    return new BedrockClaudeLLM(modelsInternallKeySet, modelsMetadata, errorPatterns);
  },
}; 