// This file sets up Jest environment for testing LLM provider manifests
// Environment variables are mocked to prevent manifest loading errors during tests
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Mock environment variables that might be needed during testing
process.env.NODE_ENV = 'test';
process.env.LLM = 'AzureOpenAI';
process.env.CODEBASE_DIR_PATH = "/test/path/petstore1.3.2";
// Use MONGODB_URL from .env if it exists, otherwise use a default
process.env.MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/test";
process.env.IGNORE_ALREADY_PROCESSED_FILES = "false";

// OpenAI API variables
process.env.OPENAI_LLM_API_KEY = "test-openai-key";
process.env.OPENAI_TEXT_EMBEDDINGS_MODEL = "text-embedding-3-small";
process.env.OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY = "gpt-4o";
process.env.OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY = "gpt-4-turbo";

// Azure OpenAI API variables
process.env.AZURE_OPENAI_LLM_API_KEY = 'test-key';
process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';
process.env.AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT = 'test-embeddings';
process.env.AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY = 'test-primary';
process.env.AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY = 'test-secondary';
process.env.AZURE_OPENAI_ADA_EMBEDDINGS_MODEL = 'text-embedding-ada-002';
process.env.AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY = 'gpt-4o';
process.env.AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY = 'gpt-4-turbo';

// GCP VertexAI API variables
process.env.VERTEXAI_PROJECTID = "test-gcp-project";
process.env.VERTEXAI_LOCATION = "us-central1";
process.env.VERTEXAI_TEXT_EMBEDDINGS_MODEL = "text-embedding-005";
process.env.VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY = "gemini-2.5-pro-preview-05-06";
process.env.VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY = "gemini-2.0-flash-001";

// AWS Bedrock API variables
process.env.BEDROCK_TITAN_EMBEDDINGS_MODEL = "amazon.titan-embed-text-v1";
// Bedrock Claude models
process.env.BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY = "anthropic.claude-3-5-sonnet-20240620-v1:0";
process.env.BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY = "anthropic.claude-3-5-haiku-20241022-v1:0";
// Bedrock Nova models
process.env.BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY = "amazon.nova-pro-v1:0";
process.env.BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY = "amazon.nova-lite-v1:0";
// Bedrock Titan models
process.env.BEDROCK_TITAN_COMPLETIONS_MODEL_PRIMARY = "amazon.titan-text-express-v1";
// Bedrock Llama models
process.env.BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY = "us.meta.llama3-3-70b-instruct-v1:0";
process.env.BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY = "us.meta.llama3-2-90b-instruct-v1:0";
// Bedrock Mistral models
process.env.BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY = "mistral.mistral-large-2407-v1:0";
process.env.BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY = "mistral.mistral-large-2402-v1:0";
// Bedrock Deepseek models
process.env.BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY = "deepseek.r1-v1:0"; 
