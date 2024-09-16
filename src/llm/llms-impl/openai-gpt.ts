import { OpenAI, BadRequestError, AuthenticationError, PermissionDeniedError, NotFoundError, 
         UnprocessableEntityError, RateLimitError, InternalServerError } from "openai";
import envConst from "../../types/env-constants";
import { getEnvVar } from "../../utils/envvar-utils";
import { llmConst } from "../../types/llm-constants";
import { GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3, GPT_COMPLETIONS_MODEL_GPT4_TURBO,
         GPT_COMPLETIONS_MODEL_GPT4_O, 
         llmModels} from "../../types/llm-models";
import { LLMConfiguredModelTypes } from "../../types/llm-types";
import { GPTLLMError } from "../../types/gpt-types";
import AbstractGPT from "./abstract-gpt";


/**
 * Class for the public OpenAI service.
 */
class OpenAIGPT extends AbstractGPT {
  // Private fields
  private readonly client: OpenAI;


  /**
   * Constructor.
   */
  constructor() { 
    const apiKey = getEnvVar<string>(envConst.ENV_OPENAI_LLM_API_KEY);
    if (!apiKey) throw new Error("The following environment variable must be specified if using OpenAI: 'OPENAI_LLM_API_KEY'");
    super(GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3, GPT_COMPLETIONS_MODEL_GPT4_O, GPT_COMPLETIONS_MODEL_GPT4_O);
    this.client = new OpenAI({ apiKey })       
  }


  /**
   * Get the names of the models this plug-in provides.
   */ 
  public getModelsNames(): LLMConfiguredModelTypes {
    return {
      embeddings: GPT_EMBEDDINGS_MODEL_TEXT_EMBDG3,
      regular: GPT_COMPLETIONS_MODEL_GPT4_TURBO,
      premium: GPT_COMPLETIONS_MODEL_GPT4_O,
    };
  }


  /**
   * Invoke the actuall LLM's embedding API directly.
   */ 
  protected async runGPTGetEmbeddings(model: string, content: string): Promise<OpenAI.CreateEmbeddingResponse> {
    const params = { model, input: content };
    return await this.client.embeddings.create(params);    
  }


  /**
   * Invoke the actuall LLM's completion API directly.
   */ 
  protected async runGPTGetCompletion(model: string, prompt: string): Promise<OpenAI.ChatCompletion> {
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model,
      temperature: llmConst.ZERO_TEMP,
      max_completion_tokens: llmModels[model].maxCompletionTokens,
      messages: [{ role: "user", content: prompt } ],
    };
    return await this.client.chat.completions.create(params);
  }


  /**
   * See if an error object indicates a network issue or throttling event.
   */
  protected isLLMOverloaded(error: unknown): boolean {
    // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error);
    return ((error instanceof RateLimitError) || (error instanceof InternalServerError));
  }


  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown): boolean {
    const llmError = error as GPTLLMError;
    return llmError.code === "context_length_exceeded" ||
           llmError.type === "invalid_request_error";
  }
  
  
  /** 
   * Debug currently non-checked error types.
   */
  private debugCurrentlyNonCheckedErrorTypes(error: unknown) {
    if (error instanceof BadRequestError) console.log("BadRequestError");
    if (error instanceof AuthenticationError) console.log("AuthenticationError");
    if (error instanceof PermissionDeniedError) console.log("PermissionDeniedError");
    if (error instanceof NotFoundError) console.log("NotFoundError");
    if (error instanceof UnprocessableEntityError) console.log("UnprocessableEntityError");
  }
}


export default OpenAIGPT;