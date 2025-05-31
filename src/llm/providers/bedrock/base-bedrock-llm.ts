import { BedrockRuntimeClient, InvokeModelCommand, ServiceUnavailableException,
  ThrottlingException, ModelTimeoutException, ValidationException }
from "@aws-sdk/client-bedrock-runtime";     
import { LLMModelSet, LLMPurpose, LLMModelMetadata, LLMErrorMsgRegExPattern } from "../../../types/llm.types";
import llmConfig from "../../../config/llm.config";
import { LLMImplSpecificResponseSummary } from "../llm-provider.types";
import { getErrorText } from "../../../utils/error-utils";
import AbstractLLM from "../base/abstract-llm";

/**
 * Class for the public AWS Bedrock service (multiple possible LLMs)
 * 
 * Some of the possible recevable Bedrock exceptions as of April 2025:
 * 
 * BedrockRuntimeClient, InvokeModelCommand, ModelErrorException, ModelStreamErrorException, 
 * ResourceNotFoundException, ServiceQuotaExceededException, ServiceUnavailableException,
 * ThrottlingException, ModelNotReadyException, ModelTimeoutException, ValidationException,
 * CredentialsProviderError
 */
abstract class BaseBedrockLLM extends AbstractLLM {
  // Private fields
  private readonly bedrockRuntimeClient: BedrockRuntimeClient;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelSet,
    modelsMetadata: Record<string, LLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[]
  ) {
    super(modelsKeys, modelsMetadata, errorPatterns);
    // TODO: fix tis hardcoded region setting
    this.bedrockRuntimeClient = new BedrockRuntimeClient({ region: "us-east-1" });
  }

  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeImplementationSpecificLLM(taskType: LLMPurpose, modelKey: string, prompt: string): Promise<LLMImplSpecificResponseSummary> {
    const params = this.buildFullLLMParameters(taskType, modelKey, prompt);    

    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.invokeImplementationSpecificEmbeddingsLLM(params);
    } else {
      return this.invokeImplementationSpecificCompletionLLM(params);
    }
  }

  /**
   * Assemble the AWS Bedrock API parameters structure for embeddings and completions models with 
   * the prompt.
   */
  protected buildFullLLMParameters(taskType: LLMPurpose, modelKey: string, prompt: string) {
    let body;

    if (taskType === LLMPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
        //dimensions: this.getEmbeddedModelDimensions(),  // Throws error but when moving to Titan Text Embeddings V2 should be able to set dimensions to 56, 512, 1024 according to: https://docs.aws.amazon.com/code-library/latest/ug/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_TitanTextEmbeddings_section.html
      });
    } else {
      body = this.buildCompletionModelSpecificParameters(modelKey, prompt);
    }

    return {
      modelId: this.llmModelsMetadata[modelKey].urn,
      contentType: llmConfig.LLM_RESPONSE_JSON_CONTENT_TYPE,
      accept: llmConfig.LLM_RESPONSE_ANY_CONTENT_TYPE,
      body,
    };
  }

  /**
   * See if an error object indicates a network issue or throttling event.
   */
  protected isLLMOverloaded(error: unknown) {
    return ((error instanceof ServiceUnavailableException) || (error instanceof ThrottlingException) || (error instanceof ModelTimeoutException));
  }

  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown) {
    if (error instanceof ValidationException) {
      const errorMsgLowercase = getErrorText(error).toLowerCase();
      return errorMsgLowercase.includes("too many input tokens") || 
             errorMsgLowercase.includes("too long") ||
             errorMsgLowercase.includes("maximum context length") ||
             errorMsgLowercase.includes("maxlength") ||
             errorMsgLowercase.includes("limit");
    }

    return false;
  }

  /**
   * Invoke the actual LLM's embedding API directly.
   */ 
  private async invokeImplementationSpecificEmbeddingsLLM(fullLLMParams: {
    modelId: string;
    contentType: string;
    accept: string;
    body: string;
  }): Promise<LLMImplSpecificResponseSummary> {
    // Invoke LLM
    const command = new InvokeModelCommand(fullLLMParams);
    const llmResponse = await this.bedrockRuntimeClient.send(command);
    const responseBodyText = new TextDecoder().decode(llmResponse.body);
    const responseContent = JSON.parse(responseBodyText) as TitanEmbeddingsLLMSpecificResponse;

    // Capture response content
    const responseEmbedding = responseContent.embedding ?? [];

    // Capture finish reason
    const isIncompleteResponse = (responseEmbedding.length === 0);

    // Capture token usage 
    const promptTokens = responseContent.inputTextTokenCount ?? -1;
    const completionTokens = -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent: responseEmbedding, tokenUsage };
  }

  /**
   * Invoke the actual LLM's completion API directly.
   */ 
  private async invokeImplementationSpecificCompletionLLM(fullLLMParams: {
    modelId: string;
    contentType: string;
    accept: string;
    body: string;
  }): Promise<LLMImplSpecificResponseSummary> {
    // Invoke LLM
    const command = new InvokeModelCommand(fullLLMParams);
    const llmResponse = await this.bedrockRuntimeClient.send(command);
    const responseBodyText = new TextDecoder().decode(llmResponse.body);
    const responseBodyJSONObj = JSON.parse(responseBodyText) as unknown;

    return this.extractCompletionModelSpecificResponse(responseBodyJSONObj);
  }

  /**
   * Abstract method to be overriden. Assemble the AWS Bedrock API parameters structure for the 
   * specific completions model hosted on Bedroc.
   */
  protected abstract buildCompletionModelSpecificParameters(modelKey: string, prompt: string): string;

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected abstract extractCompletionModelSpecificResponse(llmResponse: unknown): LLMImplSpecificResponseSummary;
}

// Type definitions for the Titan specific embeddings LLM response usage.
interface TitanEmbeddingsLLMSpecificResponse {
  embedding?: number[]; 
  inputTextTokenCount?: number;
  results?: {
    tokenCount?: number;
  }[];
}

export default BaseBedrockLLM;