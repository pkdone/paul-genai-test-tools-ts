import { EnvVars } from "../../types/env-types";
import { ModelFamily, modelProviderMappings } from "../../types/llm-models-metadata";
import OpenAILLM from "../llms-impl/openai/openai-llm";
import AzureOpenAILLM from "../llms-impl/openai/azure-openai-llm";
import VertexAIGeminiLLM from "../llms-impl/vertexai/vertexai-gemini-llm";
import BedrockTitanLLM from "../llms-impl/bedrock/bedrock-titan-llm";
import BedrockClaudeLLM from "../llms-impl/bedrock/bedrock-claude-llm";
import BedrockLlamaLLM from "../llms-impl/bedrock/bedrock-llama-llm";
import BedrockMistralLLM from "../llms-impl/bedrock/bedrock-mistral-llm";
import BedrockNovaLLM from "../llms-impl/bedrock/bedrock-nova-llm";
import BedrockDeepseekLLM from "../llms-impl/bedrock/bedrock-deepseek-llm";

/**
 * Initialize and return the appropriate LLM implementation based on environment variables.
 * 
 * @param env The loaded environment variables
 * @returns The appropriate LLM provider implementation
 */
export function initializeLLMImplementation(env: EnvVars) {
  const modelFamily = env.LLM as ModelFamily;

  switch (modelFamily) {
    case ModelFamily.OPENAI_MODELS: {
      return new OpenAILLM(modelProviderMappings[ModelFamily.OPENAI_MODELS], env.OPENAI_LLM_API_KEY);
    }
    case ModelFamily.AZURE_OPENAI_MODELS: {
      return new AzureOpenAILLM(
        modelProviderMappings[ModelFamily.AZURE_OPENAI_MODELS], 
        env.AZURE_LLM_API_KEY, 
        env.AZURE_API_ENDPOINT, 
        env.AZURE_API_EMBEDDINGS_MODEL, 
        env.AZURE_API_COMPLETIONS_MODEL_PRIMARY, 
        env.AZURE_API_COMPLETIONS_MODEL_SECONDARY
      );
    }
    case ModelFamily.VERTEXAI_GEMINI_MODELS: {
      return new VertexAIGeminiLLM(
        modelProviderMappings[ModelFamily.VERTEXAI_GEMINI_MODELS], 
        env.GCP_API_PROJECTID, 
        env.GCP_API_LOCATION
      );
    }
    case ModelFamily.BEDROCK_TITAN_MODELS: {
      return new BedrockTitanLLM(modelProviderMappings[ModelFamily.BEDROCK_TITAN_MODELS]);
    }
    case ModelFamily.BEDROCK_CLAUDE_MODELS: {
      return new BedrockClaudeLLM(modelProviderMappings[ModelFamily.BEDROCK_CLAUDE_MODELS]);
    }
    case ModelFamily.BEDROCK_LLAMA_MODELS: {
      return new BedrockLlamaLLM(modelProviderMappings[ModelFamily.BEDROCK_LLAMA_MODELS]);
    }
    case ModelFamily.BEDROCK_MISTRAL_MODELS: {
      return new BedrockMistralLLM(modelProviderMappings[ModelFamily.BEDROCK_MISTRAL_MODELS]);
    }
    case ModelFamily.BEDROCK_NOVA_MODELS: {
      return new BedrockNovaLLM(modelProviderMappings[ModelFamily.BEDROCK_NOVA_MODELS]);
    }    
    case ModelFamily.BEDROCK_DEEPSEEK_MODELS: {
      return new BedrockDeepseekLLM(modelProviderMappings[ModelFamily.BEDROCK_DEEPSEEK_MODELS]);
    }
  }
}
