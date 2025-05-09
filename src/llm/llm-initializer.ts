import { loadEnvVars } from "../env/env-vars";
import { ModelFamily, modelProviderMappings } from "../types/llm-models-metadata";
import OpenAILLM from "./llms-impl/openai/openai-llm";
import AzureOpenAILLM from "./llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "./llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "./llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "./llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "./llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "./llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "./llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "./llms-impl/bedrock/bedrock-deepseek-llm";

/**
 * Load the appropriate class for the required LLM provider.
 */
export function initializeLLMImplementation(providerName: ModelFamily) {
  const env = loadEnvVars();

  switch (providerName) {
    case ModelFamily.OPENAI_MODELS: {
      const openAIApiKey = env.OPENAI_LLM_API_KEY;
      return new OpenAILLM(modelProviderMappings.OPENAI_MODELS, openAIApiKey);
    }
    case ModelFamily.AZURE_OPENAI_MODELS: {
      const azureApiKey: string = env.AZURE_LLM_API_KEY; 
      const endpoint: string = env.AZURE_API_ENDPOINT;
      const embeddingsDeployment = env.AZURE_API_EMBEDDINGS_MODEL;
      const primaryCompletionsDeployment = env.AZURE_API_COMPLETIONS_MODEL_PRIMARY;
      const secondaryCompletionsDeployment = env.AZURE_API_COMPLETIONS_MODEL_SECONDARY;
      return new AzureOpenAILLM(modelProviderMappings.AZURE_MODELS, azureApiKey, endpoint, embeddingsDeployment, primaryCompletionsDeployment, secondaryCompletionsDeployment);
    }
    case ModelFamily.VERTEXAI_GEMINI_MODELS: {
      const project = env.GCP_API_PROJECTID;
      const location = env.GCP_API_LOCATION;
      return new VertexAIGeminiLLM(modelProviderMappings.VERTEXAI_MODELS, project, location);
    }
    case ModelFamily.BEDROCK_TITAN_MODELS: {
      return new BedrockTitanLLM(modelProviderMappings.BEDROCK_TITAN_MODELS);
    }
    case ModelFamily.BEDROCK_CLAUDE_MODELS: {
      return new BedrockClaudeLLM(modelProviderMappings.BEDROCK_CLAUDE_MODELS);
    }
    case ModelFamily.BEDROCK_LLAMA_MODELS: {
      return new BedrockLlamaLLM(modelProviderMappings.BEDROCK_LLAMA_MODELS);
    }
    case ModelFamily.BEDROCK_MISTRAL_MODELS: {
      return new BedrockMistralLLM(modelProviderMappings.BEDROCK_MISTRAL_MODELS);
    }
    case ModelFamily.BEDROCK_NOVA_MODELS: {
      return new BedrockNovaLLM(modelProviderMappings.BEDROCK_NOVA_MODELS);
    }    
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS: {
      return new BedrockDeepseekLLM(modelProviderMappings.BEDROCK_DEEPSEEK_MODELS);
    }    
  }
}
