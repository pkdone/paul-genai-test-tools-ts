import { llmConst } from "../types/llm-constants";
import { withRetry } from "../utils/control-utils";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelQualities, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse } 
  from "../types/llm-types";
import { getErrorText, getErrorStack } from "../utils/error-utils";
import { reducePromptSizeToTokenLimit } from "./llm-response-tools";
import LLMStats from "./llm-stats";
import OpenAIGPT from "./llms-impl/openai-gpt";
import AzureOpenAIGPT from "./llms-impl/azure-openai-gpt";
import GcpVertexAIGemini from "./llms-impl/gcp-vertexai-gemini";
import AWSBedrockTitan from "./llms-impl/aws-bedrock-titan";
import AWSBedrockClaude from "./llms-impl/aws-bedrock-claude";
import AWSBedrockLlama from "./llms-impl/aws-bedrock-llama";


/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization / 
 * completion function:
 * 
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
class LLMRouter {
  // Private fields
  private readonly llmProviderName: string;
  private readonly llmImpl: LLMProviderImpl;
  private readonly llmStats: LLMStats;
  private readonly doLogEachResource: boolean;
  private readonly loggedMissingModelWarning: { [key: string]: boolean } = { regular: false, premium: false };


  /**
   * Constructor.
   */
  constructor(llmProviderName: string, doLogLLMInvocationEvents: boolean) {
    this.llmProviderName = llmProviderName;
    this.llmImpl = this.initializeLLMImplementation(llmProviderName);
    this.llmStats = new LLMStats(doLogLLMInvocationEvents);
    this.doLogEachResource = false;
    this.log(`Initiated LLMs from: ${this.llmProviderName}`);
  }

  
  /**
   * Load the appropriate class for the required LLM provider.
   */
  private initializeLLMImplementation(providerName: string): LLMProviderImpl {
    switch (providerName) {
      case llmConst.OPENAI_GPT_MODELS: return new OpenAIGPT();
      case llmConst.AZURE_OPENAI_GPT_MODELS: return new AzureOpenAIGPT();
      case llmConst.GCP_VERTEXAI_GEMINI_MODELS: return new GcpVertexAIGemini();
      case llmConst.AWS_BEDROCK_TITAN_MODELS: return new AWSBedrockTitan();
      case llmConst.AWS_BEDROCK_CLAUDE_MODELS: return new AWSBedrockClaude();
      case llmConst.AWS_BEDROCK_LLAMA_MODELS: return new AWSBedrockLlama();
      default: throw new Error("No valid LLM implementation specified via the 'LLM' environment variable");
    }
  }


  /**
   * Call close on LLM implementation to release resources.
   */
  public async close(): Promise<void> {
    await this.llmImpl.close();
  }


  /**
   * Get the description of models the chosen plug-in provides.
   */
  public getModelsUsedDescription(): string {
    const { embeddings, regular, premium } = this.llmImpl.getModelsNames();
    return `${this.llmProviderName} (embeddings: ${embeddings}, completions-regular: ${regular}, completions-premium: ${premium})`;
  }  


  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async generateEmbeddings(resourceName: string, content: string, context: LLMContext = {}): Promise<LLMGeneratedContent> {
    context.purpose = LLMPurpose.EMBEDDINGS;
    const llmFunc = this.llmImpl.generateEmbeddings.bind(this.llmImpl);
    return await this.invokeLLMWithRetriesAndAdaptation(resourceName, content, context, [llmFunc]);
  }


  /**
   * Send the prompt to the LLM for a particular model quality and retrieve the LLM's answer.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async executeCompletion(resourceName: string, prompt: string, startingModelQuality: LLMModelQualities, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMGeneratedContent> {
    context.purpose = LLMPurpose.COMPLETION;
    const modelQualitiesSupported = this.llmImpl.getAvailableCompletionModelQualities();
    startingModelQuality = this.adjustStartingModelQualityBasedOnAvailability(modelQualitiesSupported, startingModelQuality);
    context.modelQuality = (startingModelQuality === LLMModelQualities.REGULAR_PLUS) ? LLMModelQualities.REGULAR : startingModelQuality;
    return this.invokeLLMWithRetriesAndAdaptation(resourceName, prompt, context, this.getModelQualityCompletionFunctions(startingModelQuality), doReturnJSON);
  }  


  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, stepping up LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(resourceName: string, prompt: string, context: LLMContext, llmFuncs: LLMFunction[],
                                                  doReturnJSON: boolean = false): Promise<LLMGeneratedContent> {
    let currentPrompt = prompt;
    let result: LLMGeneratedContent = null;
    let llmFuncIndex = 0;

    while (llmFuncIndex < llmFuncs.length) {
      try {
        if (this.doLogEachResource) this.log(`PROCESS: ${resourceName}`);
        let llmResponse = await this.executeLLMFuncWithRetries(llmFuncs[llmFuncIndex], currentPrompt, doReturnJSON, context);

        if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
          result = llmResponse.generated || null;
          this.llmStats.recordSuccess();
          break;
        } else if ((!llmResponse) || (llmResponse.status === LLMResponseStatus.OVERLOADED)) {
          this.logWithContext(`LLM problem processing prompt for completion with current LLM model because it is overloaded or timing out, even after retries`, context);
          break;
        } else if (llmResponse.status === LLMResponseStatus.EXCEEDED) {
          this.logWithContext(`LLM prompt tokens used ${llmResponse.tokensUage?.promptTokens} plus completion tokens used ${llmResponse.tokensUage?.completionTokens} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUage?.maxTotalTokens}, or: 2) the model's completion tokens limit`, context);

          if ((llmFuncIndex + 1) >= llmFuncs.length) { 
            if (!llmResponse.tokensUage) throw new Error("LLM response indicated token limit exceeded but for some reason `tokensUage` is not present");
            currentPrompt = reducePromptSizeToTokenLimit(currentPrompt, llmResponse.model, llmResponse.tokensUage );
            this.llmStats.recordCrop();
            continue;  // Don't attempt to move up to next [non-existent] LLM quality - want to try current LLM with ths cut down prompt size
          }  
        } else {
          throw new Error(`An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource ''${resourceName}'' - response status received: '${llmResponse?.status}'`);
        }

        context.modelQuality = LLMModelQualities.PREMIUM;
        llmFuncIndex++;

        if (llmFuncIndex < llmFuncs.length) {
          this.llmStats.recordStepUp();
        }
      } catch (error: unknown) {
        this.logErrWithContext(error, context);
        break;
      }
    }

    if (!result) {
      this.log(`Given-up on trying to process the following resource with an LLM: '${resourceName}'`);
      this.llmStats.recordFailure();
    }

    return result;
  } 


  /**
   * Send a prompt to an LLM for completion, retrying a number of times if the LLM is overloaded. 
   */
  private async executeLLMFuncWithRetries(llmFunc: LLMFunction, prompt: string, doReturnJSON: boolean, context: LLMContext): Promise<LLMFunctionResponse | null> {
    const recordRetryFunc = this.llmStats.recordRetry.bind(this.llmStats);
    return await withRetry(
      llmFunc,
      [prompt, doReturnJSON, context],
      result => (result?.status === LLMResponseStatus.OVERLOADED),
      recordRetryFunc,
      llmConst.INVOKE_LLM_NUM_ATTEMPTS, llmConst.MIN_RETRY_DELAY_MILLIS,
      llmConst.MAX_RETRY_ADDITIONAL_MILLIS, llmConst.REQUEST_WAIT_TIMEOUT_MILLIS, true
    );
  }


  /**
   * Retrieve the specific LLM's embedding/completion functions to be used based on the desired
   * model quality.
   */
  private getModelQualityCompletionFunctions(modelQuality: LLMModelQualities): LLMFunction[] {
    const modelFuncs = [];
    
    if ([LLMModelQualities.REGULAR, LLMModelQualities.REGULAR_PLUS].includes(modelQuality)) { 
      modelFuncs.push(this.llmImpl.executeCompletionRegular.bind(this.llmImpl));
    }

    if ([LLMModelQualities.PREMIUM, LLMModelQualities.REGULAR_PLUS].includes(modelQuality)) { 
      modelFuncs.push(this.llmImpl.executeCompletionPremium.bind(this.llmImpl));
    }

    return modelFuncs;
  }


  /**
   * Adjust the starting model quality used based on availability and log warnings if necessary.
   */
  private adjustStartingModelQualityBasedOnAvailability(invocableModelQualitiesAvailable: LLMModelQualities[], startingModelQuality: LLMModelQualities): LLMModelQualities {
    if (!invocableModelQualitiesAvailable || invocableModelQualitiesAvailable.length <= 0) {
      throw new Error("The LLM implementation doesn't implement any completions model quality");
    }

    startingModelQuality = this.adjustCategoryOfModelQualityIfNeededLoggingIssue(
      [LLMModelQualities.REGULAR, LLMModelQualities.REGULAR_PLUS], 
      startingModelQuality, 
      invocableModelQualitiesAvailable, 
      LLMModelQualities.REGULAR,
      llmConst.REGULAR_MODEL_QUALITY_NAME, 
      LLMModelQualities.PREMIUM,
      llmConst.PREMIUM_MODEL_QUALITY_NAME);
    startingModelQuality = this.adjustCategoryOfModelQualityIfNeededLoggingIssue(
      [LLMModelQualities.PREMIUM, LLMModelQualities.REGULAR_PLUS], 
      startingModelQuality, 
      invocableModelQualitiesAvailable, 
      LLMModelQualities.PREMIUM,
      llmConst.PREMIUM_MODEL_QUALITY_NAME, 
      LLMModelQualities.REGULAR,
      llmConst.REGULAR_MODEL_QUALITY_NAME);
    return startingModelQuality;
  }


  /**
   * Function to adjust the model quality used based on availability and log warning if necessary.
   */
  private adjustCategoryOfModelQualityIfNeededLoggingIssue(categoryOfModelQualityOptions: LLMModelQualities[], startingModelQuality: LLMModelQualities, invocableModelQualitiesAvailable: LLMModelQualities[], targetModelQuality: LLMModelQualities, targetModelQualityName: string, fallbackModelQuality: LLMModelQualities, fallbackModelQualityName: string) {
    if (categoryOfModelQualityOptions.includes(startingModelQuality)) {
      if (!invocableModelQualitiesAvailable.includes(targetModelQuality)) {
        if (!this.loggedMissingModelWarning[targetModelQualityName]) {
          this.log(`WARNING: Requested LLM completion model type of '${targetModelQualityName}' does not exist, so will only attempt to use '${fallbackModelQualityName}' model`);
          this.loggedMissingModelWarning[targetModelQualityName] = true;
        }

        startingModelQuality = fallbackModelQuality;
      }
    }

    return startingModelQuality;
  }


  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  public displayLLMStatusSummary(): void {
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }


  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  public displayLLMStatusDetails(): void {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }


  /**
   * Log info/error text to the console or a redirected-to file
   */
  private log(text: string): void {
    console.log(text);
  }


  /**
   * Log both the error content and also any context associated with work being done when the 
   * error occurred, add the context to the error object and then throw the augmented error.
   */
  private logErrWithContext(error: unknown, context: LLMContext): void {
    console.error(getErrorText(error), getErrorStack(error));
    this.logContext(context);
  }


  /**
   * Log the message and the associated context keys and values.
   */
  private logWithContext(msg: string, context: LLMContext): void {
    this.log(msg);
    this.logContext(context);
  }


  /**
   * Log the context keys and values.
   */
  private logContext(context: LLMContext): void {
    if (context) {
      if (typeof context === "object" && !Array.isArray(context)) {
        for (const [key, value] of Object.entries(context)) {
          this.log(`  * ${key}: ${value}`);
        }
      } else {
        this.log(`  * ${JSON.stringify(context)}`);
      }
    }
  }
}


export default LLMRouter;