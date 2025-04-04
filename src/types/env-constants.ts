/**
 * Set of environment variable keys
 */
const envConst = {
  ENV_CODEBASE_DIR_PATH: "CODEBASE_DIR_PATH",
  ENV_IGNORE_ALREADY_PROCESSED_FILES: "IGNORE_ALREADY_PROCESSED_FILES",  
  ENV_MONGODB_URL: "MONGODB_URL",
  ENV_LLM_USE_PREMIUM_ONLY: "PREMIUM_LLM_ONLY",
  ENV_LLM: "LLM",
  ENV_OPENAI_LLM_API_KEY: "OPENAI_LLM_API_KEY",
  ENV_AZURE_LLM_API_KEY: "AZURE_LLM_API_KEY",
  ENV_AZURE_API_ENDPOINT: "AZURE_API_ENDPOINT", 
  ENV_AZURE_API_EMBEDDINGS_MODEL: "AZURE_API_EMBEDDINGS_MODEL",
  ENV_AZURE_API_COMPLETIONS_MODEL_REGULAR: "AZURE_API_COMPLETIONS_MODEL_REGULAR",
  ENV_AZURE_API_COMPLETIONS_MODEL_PREMIUM: "AZURE_API_COMPLETIONS_MODEL_PREMIUM",
  ENV_GCP_API_PROJECTID: "GCP_API_PROJECTID",
  ENV_GCP_API_LOCATION: "GCP_API_LOCATION",
  ENV_LOG_LLM_INOVOCATION_EVENTS: "LOG_LLM_INOVOCATION_EVENTS",
} as const;

export default envConst;