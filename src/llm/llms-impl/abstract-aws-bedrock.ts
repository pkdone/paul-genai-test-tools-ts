import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput, ModelErrorException,
         ModelStreamErrorException, ResourceNotFoundException, ServiceQuotaExceededException, 
         ServiceUnavailableException, ThrottlingException, ModelNotReadyException, 
         ModelTimeoutException, ValidationException } from "@aws-sdk/client-bedrock-runtime";
import { llmAPIErrorPatterns } from "../../types/llm-constants";
import { LLMPurpose, LLMConfiguredModelTypes, LLMContext, LLMFunctionResponse } from "../../types/llm-types";
import AbstractLLM from "../abstract-llm";
const UTF8_ENCODING = "utf8";


/**
 * Class for the public AWS Bedrock service (multiple possible LLMs)
 */
export abstract class AbstractAWSBedrock extends AbstractLLM {
  // Private fields
  private readonly embeddingsModelName: string;
  private readonly completionsModelRegularName: string;
  private readonly completionsModelPremiumName: string;
  private readonly client: BedrockRuntimeClient;


  /**
   * Constructor.
   */
  constructor(embeddingsModel: string, completionsModelRegular: string | null, completionsModelPremium: string | null, embeddingsModelName: string, completionsModelRegularName: string, completionsModelPremiumName: string) { 
    super(embeddingsModel, completionsModelRegular,completionsModelPremium );
    this.embeddingsModelName = embeddingsModelName;
    this.completionsModelRegularName = completionsModelRegularName;
    this.completionsModelPremiumName = completionsModelPremiumName;
    this.client = new BedrockRuntimeClient();
    console.log("AWS Bedrock client created");
  }

  
  /**
   * Abstract method to be overriden. Assemble the AWS Bedrock API parameters structure for the 
   * specific models and prompt.
   */
  protected abstract buildFullLLMParameters(taskType: LLMPurpose, model: string, prompt: string): InvokeModelCommandInput;


  /**
   * Call close on underlying LLM client library to release resources.
   */ 
  public async close(): Promise<void> {
    try {
      this.client.destroy();
    } catch (error: unknown) {
      const stack = (error instanceof Error) ? error.stack : undefined;
      console.error("Error when calling destroy on AWSBedroc LLM", error, stack);
    }
  }


  /**
   * Get the names of the models this plug-in provides.
   */ 
  public getModelsNames(): LLMConfiguredModelTypes {
    return {
      embeddings: this.embeddingsModelName,
      regular: this.completionsModelRegularName,
      premium: this.completionsModelPremiumName,
    };
  }  


  /**
   * Execute the prompt against the LLM and return the LLM's answer.
   * 
   * NOTE: `rawResponse["$metadata"]?.httpStatusCode` shows the response status code. However, this
   * always seems to be 200 if no exceptions thrown. Other codes like 400 or 429 only appear in the
   * `error`object thrown by the API, so only accessible from the catch block.
   */
  protected async runLLMTask(model: string, taskType: LLMPurpose, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse> {

    try {
      // Invoke LLM
      const fullParameters = this.buildFullLLMParameters(taskType, model, prompt);
      const command = new InvokeModelCommand(fullParameters);
      const rawResponse = await this.client.send(command);
      if (!rawResponse?.body) throw new Error("LLM raw response was completely empty");
      const llmResponse = JSON.parse(Buffer.from(rawResponse.body).toString(UTF8_ENCODING));
      if (!llmResponse) throw new Error("LLM response when converted to JSON was empty");

      // Capture response content
      const responseContent = llmResponse.embedding || llmResponse?.completion || llmResponse?.content?.[0]?.text || llmResponse?.results[0]?.outputText;

      // Capture response reason
      const finishReason = llmResponse?.stop_reason || llmResponse?.results?.[0]?.completionReason;
      const isIncompleteResponse = ((finishReason === "max_tokens") || (finishReason === "LENGTH") || !responseContent);

      // Capture token usage  (for 3 settings below, first option is for Titan LLMs, second is Claude LLMs)
      const promptTokens = llmResponse?.inputTextTokenCount ?? llmResponse?.usage?.input_tokens ?? -1;
      const completionTokens = llmResponse?.results?.[0]?.tokenCount ?? llmResponse?.usage?.output_tokens ?? -1;
      const maxTotalTokens = -1;
      const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
      
      // Process successful response
      return this.captureLLMResponseFromSuccessfulCall(prompt, context, isIncompleteResponse, model, responseContent, tokenUsage, taskType, doReturnJSON);
    } catch (error: unknown) {
      // Process error response
      return this.captureLLMResponseFromThrownError(error, prompt, context, model, llmAPIErrorPatterns.BEDROCK_ERROR_MSG_TOKENS_PATTERNS);
    }
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
      const lowercaseContent = error.message.toLowerCase();    

      if ((lowercaseContent.includes("too many input tokens")) ||
          (lowercaseContent.includes("expected maxlength")) ||
          (lowercaseContent.includes("input is too long"))) {
        return true;
      }
    }

    return false;
  }


  /** 
   * Debug currently non-checked error types.
   */
  private debugCurrentlyNonCheckedErrorTypes(error: unknown) {
    if (error instanceof ModelErrorException) console.log(`ModelErrorException: ${error.message}`);
    if (error instanceof ModelStreamErrorException) console.log(`ModelStreamErrorException: ${error.message}`);
    if (error instanceof ResourceNotFoundException) console.log(`ResourceNotFoundException: ${error.message}`);
    if (error instanceof ServiceQuotaExceededException) console.log(`ServiceQuotaExceededException: ${error.message}`);
    if (error instanceof ValidationException) console.log(`ValidationException: ${error.message}`);
    if (error instanceof ModelNotReadyException) console.log(`ModelNotReadyException: ${error.message}`);
  }
}

