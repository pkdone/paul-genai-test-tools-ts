/**
 * Type to define a an OpenAI/Azure GPT LLM error and its various optional properties
 */
export interface GPTLLMError {
  code?: number | string;
  status?: number | string;
  type?: string;
  error?: {
    code?: number | string;
  };
  response?: {
    status?: number;
  };
}
