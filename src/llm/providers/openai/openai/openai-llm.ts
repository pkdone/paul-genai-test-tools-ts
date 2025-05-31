import { OpenAI } from "openai";
import llmConfig from "../../../../config/llm.config";
import { LLMModelInternalKeysSet, LLMPurpose, LLMModelMetadata, LLMErrorMsgRegExPattern } from "../../../../types/llm.types";
import BaseOpenAILLM from "../base-openai-llm";
import { OPENAI } from "./openai.manifest";

/**
 * Class for the public OpenAI service.
 */
class OpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelInternalKeysSet,
    modelsMetadata: Record<string, LLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    readonly apiKey: string
  ) { 
    super(modelsKeys, modelsMetadata, errorPatterns);
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return OPENAI;
  }

  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected getClient() {
    return this.client;
  }

  /**
   * Method to assemble the OpenAI API parameters structure for the given model and prompt.
   */
  protected buildFullLLMParameters(taskType: LLMPurpose, modelInternalKey: string, prompt: string) {
    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: this.llmModelsMetadata[modelInternalKey].urn,
        input: prompt
      };
      return params;  
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.llmModelsMetadata[modelInternalKey].urn,
        temperature: llmConfig.ZERO_TEMP,
        messages: [{ role: "user", content: prompt } ],
        max_completion_tokens: this.llmModelsMetadata[modelInternalKey].maxCompletionTokens,
      };        
      return params;
    } 
  }
}

export default OpenAILLM;