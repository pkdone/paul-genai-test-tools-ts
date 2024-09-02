/**
 * Set of environment variable keys
 */
const envConst = {
  ENV_CODEBASE_DIR_PATH: "CODEBASE_DIR_PATH",
  ENV_MONGODB_URL: "MONGODB_URL",
  ENV_LLM: "LLM",
  ENV_OPENAI_LLM_API_KEY: "OPENAI_LLM_API_KEY",
  ENV_AZURE_LLM_API_KEY: "AZURE_LLM_API_KEY",
  ENV_AZURE_API_ENDPOINT: "AZURE_API_ENDPOINT", 
  ENV_AZURE_API_EMBEDDINGS_MODEL: "AZURE_API_EMBEDDINGS_MODEL",
  ENV_AZURE_API_COMPLETIONS_MODEL_SMALL: "AZURE_API_COMPLETIONS_MODEL_SMALL",
  ENV_AZURE_API_COMPLETIONS_MODEL_LARGE: "AZURE_API_COMPLETIONS_MODEL_LARGE",
  ENV_GCP_API_PROJECTID: "GCP_API_PROJECTID",
  ENV_GCP_API_LOCATION: "GCP_API_LOCATION",
  ENV_AWS_API_REGION: "AWS_API_REGION",
  ENV_LOG_LLM_INOVOCATION_EVENTS: "LOG_LLM_INOVOCATION_EVENTS",
  ENV_AWS_CLAUDE_MODEL_VERSION: "AWS_CLAUDE_MODEL_VERSION",
} as const;


export default envConst;