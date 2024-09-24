import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput, ModelErrorException,
         ModelStreamErrorException, ResourceNotFoundException, ServiceQuotaExceededException, 
         ServiceUnavailableException, ThrottlingException, ModelNotReadyException, 
         ModelTimeoutException, ValidationException } from "@aws-sdk/client-bedrock-runtime";
import { LLMPurpose, LLMConfiguredModelTypesNames, LLMImplSpecificResponseSummary } from "../../types/llm-types";
import AbstractLLM from "../abstract-llm";
import { getErrorText, getErrorStack } from "../../utils/error-utils";
import { llmConst } from "../../types/llm-constants";
import { MODEL_NOT_SPECIFIED } from "../../types/llm-models";
const UTF8_ENCODING = "utf8";


/**
 * Type definitions for the Titan specific embeddings LLM response usage.
 */
type TitanEmbeddingsLLMSpecificResponse = {
  embedding?: number[]; 
  inputTextTokenCount?: number;
  results?: Array<{
    tokenCount?: number;
  }>;
};


/**
 * Class for the public AWS Bedrock service (multiple possible LLMs)
 */
abstract class BaseAWSBedrock extends AbstractLLM {
  // Private fields
  private readonly embeddingsModelName: string;
  private readonly completionsModelRegularName: string;
  private readonly completionsModelPremiumName: string;
  private readonly client: BedrockRuntimeClient;


  /**
   * Constructor.
   */
  constructor(embeddingsModel: string, completionsModelRegular: string | null, completionsModelPremium: string | null) { 
    super(embeddingsModel, completionsModelRegular, completionsModelPremium );
    this.embeddingsModelName = embeddingsModel || MODEL_NOT_SPECIFIED;
    this.completionsModelRegularName = completionsModelRegular ?? MODEL_NOT_SPECIFIED;
    this.completionsModelPremiumName = completionsModelPremium ?? MODEL_NOT_SPECIFIED;
    this.client = new BedrockRuntimeClient({ requestHandler: { requestTimeout: llmConst.REQUEST_WAIT_TIMEOUT_MILLIS } });
    console.log("AWS Bedrock client created");
  }

  
  /**
   * Abstract method to be overriden. Assemble the AWS Bedrock API parameters structure for the 
   * specific completions model hosted on Bedroc.
   */
  protected abstract buildCompletionModelSpecificParameters(model: string, prompt: string): string;

  
  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected abstract extractCompletionModelSpecificResponse(llmResponse: unknown): LLMImplSpecificResponseSummary;


  /**
   * Call close on underlying LLM client library to release resources.
   */ 
  public async close(): Promise<void> {
    try {
      this.client.destroy();
    } catch (error: unknown) {
      console.error("Error when calling destroy on AWSBedroc LLM", getErrorText(error), getErrorStack(error));
    }
  }


  /**
   * Get the names of the models this plug-in provides.
   */ 
  public getModelsNames(): LLMConfiguredModelTypesNames {
    return {
      embeddings: this.embeddingsModelName,
      regular: this.completionsModelRegularName,
      premium: this.completionsModelPremiumName,
    };
  }  


  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   * 
   * NOTE: `rawResponse["$metadata"]?.httpStatusCode` shows the response status code. However, this
   * always seems to be 200 if no exceptions thrown. Other codes like 400 or 429 only appear in the
   * `error`object thrown by the API, so only accessible from the catch block.
   */
  protected async invokeImplementationSpecificLLM(taskType: LLMPurpose, model: string, prompt: string): Promise<LLMImplSpecificResponseSummary> {
    const fullParameters = this.buildFullLLMParameters(taskType, model, prompt);
    const command = new InvokeModelCommand(fullParameters);
    const rawResponse = await this.client.send(command);
    if (!rawResponse?.body) throw new Error("LLM raw response was completely empty");
    const llmResponse = JSON.parse(Buffer.from(rawResponse.body).toString(UTF8_ENCODING));
    if (!llmResponse) throw new Error("LLM response when converted to JSON was empty");

    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.extractEmbeddingModelSpecificResponse(llmResponse);
    } else {
      return this.extractCompletionModelSpecificResponse(llmResponse);
    }
  }


  /**
   * Assemble the AWS Bedrock API parameters structure for embeddings and completions models with 
   * the prompt.
   */
  protected buildFullLLMParameters(taskType: LLMPurpose, model: string, prompt: string): InvokeModelCommandInput  {
    let body = "";

    if (taskType === LLMPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
        // dimensions: 1024,  // When moving to Titan Text Embeddings V2 can set dimensions to 56, 512, 1024 according to: https://docs.aws.amazon.com/code-library/latest/ug/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_TitanTextEmbeddings_section.html
      });
    } else {
      body = this.buildCompletionModelSpecificParameters(model, prompt);
    }

    return {
      modelId: model,
      contentType: llmConst.RESPONSE_JSON_CONTENT_TYPE,
      accept: llmConst.RESPONSE_ANY_CONTENT_TYPE,
      body,
    };
  }

  
  /**
   * Extract the relevant information from the LLM specific response.
   */
  protected extractEmbeddingModelSpecificResponse(llmResponse: unknown): LLMImplSpecificResponseSummary {
    const responseObj = llmResponse as TitanEmbeddingsLLMSpecificResponse;
    const responseContent = responseObj?.embedding ?? [];
    const isIncompleteResponse = (!responseContent);  // If no content assume prompt maxed out total tokens available
    const promptTokens = responseObj?.inputTextTokenCount ?? -1;
    const completionTokens = responseObj?.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }


  /**
   * See if the contents of the responses indicate inability to fully process request due to 
   * overloading.
   */
  protected isLLMOverloaded(error: unknown): boolean { 
    // OPTIONAL: this.debugCurrentlyNonCheckedErrorTypes(error);
    return ((error instanceof ThrottlingException) || 
            (error instanceof ModelTimeoutException)  ||
            (error instanceof ServiceUnavailableException));
  }


  /**
   * Check to see if error code indicates potential token limit has been execeeded
   */
  protected isTokenLimitExceeded(error: unknown): boolean {
    if (error instanceof ValidationException) {
      const lowercaseContent = getErrorText(error).toLowerCase();    

      if ((lowercaseContent.includes("too many input tokens")) ||
          (lowercaseContent.includes("expected maxlength")) ||
          (lowercaseContent.includes("input is too long")) ||
          (lowercaseContent.includes("please reduce the length of the prompt"))) {   // Llama
        return true;
      }
    }

    return false;
  }


  /** 
   * Debug currently non-checked error types.
   */
  private debugCurrentlyNonCheckedErrorTypes(error: unknown) {
    if (error instanceof ModelErrorException) console.log(`ModelErrorException: ${getErrorText(error)}`);
    if (error instanceof ModelStreamErrorException) console.log(`ModelStreamErrorException: ${getErrorText(error)}`);
    if (error instanceof ResourceNotFoundException) console.log(`ResourceNotFoundException: ${getErrorText(error)}`);
    if (error instanceof ServiceQuotaExceededException) console.log(`ServiceQuotaExceededException: ${getErrorText(error)}`);
    if (error instanceof ValidationException) console.log(`ValidationException: ${getErrorText(error)}`);
    if (error instanceof ModelNotReadyException) console.log(`ModelNotReadyException: ${getErrorText(error)}`);
  }
}


export default BaseAWSBedrock;