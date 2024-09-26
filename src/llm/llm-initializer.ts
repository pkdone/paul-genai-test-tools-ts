import envConst from "../types/env-constants";
import { ModelFamily } from "../types/llm-models";
import { LLMProviderImpl } from "../types/llm-types";
import { getEnvVar } from "../utils/envvar-utils";
import OpenAILLM from "./llms-impl/openai/openai-llm";
import AzureOpenAILLM from "./llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "./llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "./llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "./llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "./llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "./llms-impl/bedrock/bedrock-mistral-llm";

/**
 * Load the appropriate class for the required LLM provider.
 */
export function initializeLLMImplementation(providerName: string): LLMProviderImpl {
  switch (providerName) {
    case ModelFamily.OPENAI_MODELS: {
      const openAIApiKey = getEnvVar<string>(envConst.ENV_OPENAI_LLM_API_KEY);
      return new OpenAILLM(openAIApiKey);
    }
    case ModelFamily.AZURE_OPENAI_MODELS: {
      const azureApiKey: string = getEnvVar<string>(envConst.ENV_AZURE_LLM_API_KEY); 
      const endpoint: string = getEnvVar<string>(envConst.ENV_AZURE_API_ENDPOINT);
      const embeddingsDeployment = getEnvVar<string>(envConst.ENV_AZURE_API_EMBEDDINGS_MODEL);
      const regularCompletionsDeployment = getEnvVar<string>(envConst.ENV_AZURE_API_COMPLETIONS_MODEL_REGULAR);
      const premiumCompletionsDeployment = getEnvVar<string>(envConst.ENV_AZURE_API_COMPLETIONS_MODEL_PREMIUM);
      return new AzureOpenAILLM(azureApiKey, endpoint, embeddingsDeployment, regularCompletionsDeployment, premiumCompletionsDeployment);
    }
    case ModelFamily.VERTEXAI_GEMINI_MODELS: {
      const project = getEnvVar<string>(envConst.ENV_GCP_API_PROJECTID);
      const location = getEnvVar<string>(envConst.ENV_GCP_API_LOCATION);
      return new VertexAIGeminiLLM(project, location);
    }
    case ModelFamily.BEDROCK_TITAN_MODELS: {
      return new BedrockTitanLLM();
    }
    case ModelFamily.BEDROCK_CLAUDE_MODELS: {
      return new BedrockClaudeLLM();
    }
    case ModelFamily.BEDROCK_LLAMA_MODELS: {
      return new BedrockLlamaLLM();
    }
    case ModelFamily.BEDROCK_MISTRAL_MODELS: {
      return new BedrockMistralLLM();
    }
    default: {
      throw new Error("No valid LLM implementation specified via the 'LLM' environment variable");
    }
  }
}