import { llmConst } from "../types/llm-constants";
import { llmModels } from "../types/llm-models";
import { withRetry } from "../utils/control-utils";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelQuality, LLMPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse, LLMResponseTokensUsage } 
  from "../types/llm-types";
import LLMStats from "./llm-stats";
import OpenAIGPT from "./llms-impl/openai-gpt";
import AzureOpenAIGPT from "./llms-impl/azure-openai-gpt";
import GcpVertexAIGemini from "./llms-impl/gcp-vertexai-gemini";
import AWSBedrockTitan from "./llms-impl/aws-bedrock-titan";
import AWSBedrockClaude from "./llms-impl/aws-bedrock-claude";


/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization / 
 * completion function:
 * 
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
class LLMRouter {
  // Private fields
  private llmProviderName: string;
  private llmImpl: LLMProviderImpl;
  private llmStats: LLMStats;
  private doLogEachResource: boolean;
  private loggedMissingRegularModelWarning: boolean;
  private loggedMissingPremiumModelWarning: boolean;


  /**
   * Constructor.
   */
  constructor(llmProviderName: string, doLogLLMInvocationEvents: boolean) {
    this.llmProviderName = llmProviderName;
    this.llmImpl = this.initializeLLMImplementation(llmProviderName);
    this.llmStats = new LLMStats(doLogLLMInvocationEvents);
    this.doLogEachResource = false;
    this.loggedMissingRegularModelWarning = false;
    this.loggedMissingPremiumModelWarning = false;
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
   * Send the prompt to the LLM for a particular model context size and retrieve the LLM's answer.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async executeCompletion(resourceName: string, prompt: string, modelSize: LLMModelQuality, doReturnJSON: boolean = false, context: LLMContext = {}): Promise<LLMGeneratedContent> {
    context.purpose = LLMPurpose.COMPLETION;
    const modelSizesSupported = this.llmImpl.getAvailableCompletionModelSizes();
    modelSize = this.adjustModelSizesBasedOnAvailability(modelSizesSupported, modelSize);
    context.modelQuality = (modelSize === LLMModelQuality.REGULAR_PLUS) ? LLMModelQuality.REGULAR : modelSize;
    const result = await this.invokeLLMWithRetriesAndAdaptation(resourceName, prompt, context, this.getModelSizeCompletionFunctions(modelSize), doReturnJSON);
    return result;
  }  


  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, stepping up LLM context window sizes, truncating large prompts)..
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
        if (this.doLogEachResource) this.log(`GO: ${resourceName}`);
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
            currentPrompt = this.reducePromptSizeToTokenLimit(currentPrompt, llmResponse.model, llmResponse.tokensUage );
            this.llmStats.recordCrop();
            continue;  // Don't attempt to move up to next [non-existent] LLM size - want to try current LLM with ths cut down prompt size
          }  
        } else {
          throw new Error(`An unknown error occurred while attempting to process prompt for completion for resource '${resourceName}'`);
        }

        context.modelQuality = LLMModelQuality.PREMIUM;
        llmFuncIndex++;

        if (llmFuncIndex < llmFuncs.length) {
          this.llmStats.recordStepUp();
        }
      } catch (error: unknown) {
        const baseError = error as Error;
        this.logErrWithContext(baseError, context);
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
   * Reduce the size of the prompt to be inside the LLM's indicated token limit.
   */
  private reducePromptSizeToTokenLimit(prompt: string, model: string, tokensUage: LLMResponseTokensUsage): string {
    const { promptTokens, completionTokens, maxTotalTokens } = tokensUage;
    const maxCompletionTokensLimit = llmModels[model].maxCompletionTokens; // will be undefined if for embeddings
    let reductionRatio = 1;
    
    // If all the LLM#s available completion tokens have been consumed then will need to reduce prompt size to try influence any subsequenet generated completion to be smaller
    if (maxCompletionTokensLimit && (completionTokens >= (maxCompletionTokensLimit - llmConst.COMPLETION_MAX_TOKENS_LIMIT_BUFFER))) {
      reductionRatio = Math.min((maxCompletionTokensLimit / (completionTokens + 1)), llmConst.COMPLETION_TOKENS_REDUCE_MIN_RATIO);
    }

    // If the total tokens used is more than the total tokens available then reduce the prompt size proportionally
    if (reductionRatio >= 1) {
      reductionRatio = Math.min((maxTotalTokens / (promptTokens + completionTokens + 1)), llmConst.PROMPT_TOKENS_REDUCE_MIN_RATIO);
    }

    const newPromptSize = Math.floor(prompt.length * reductionRatio);
    return prompt.substring(0, newPromptSize);
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
   * Retrieve the functions to be used based on the model size.
   */
  private getModelSizeCompletionFunctions(modelSize: LLMModelQuality): LLMFunction[] {
    const modelFuncs = [];
    
    if (modelSize === LLMModelQuality.REGULAR) {
      modelFuncs.push(this.llmImpl.executeCompletionRegular.bind(this.llmImpl));
    } else if (modelSize === LLMModelQuality.PREMIUM) {
      modelFuncs.push(this.llmImpl.executeCompletionPremium.bind(this.llmImpl));
    } else if (modelSize === LLMModelQuality.REGULAR_PLUS) {
      modelFuncs.push(this.llmImpl.executeCompletionRegular.bind(this.llmImpl));
      modelFuncs.push(this.llmImpl.executeCompletionPremium.bind(this.llmImpl));
    }
    
    return modelFuncs;
  }


  /**
   * Adjust the model size based on availability and log warnings if necessary.
   */
  private adjustModelSizesBasedOnAvailability(modelSizesSupported: LLMModelQuality[], modelSize: LLMModelQuality): LLMModelQuality {
    if (!modelSizesSupported || modelSizesSupported.length <= 0) {
      throw new Error("The LLM implementation doesn't implement a completions model of any size");
    }

    if (modelSize === LLMModelQuality.REGULAR || modelSize === LLMModelQuality.REGULAR_PLUS) {
      if (!modelSizesSupported.includes(LLMModelQuality.REGULAR)) {
        if (!this.loggedMissingRegularModelWarning) {
          this.log("WARNING: Requested LLM completion model type of 'regular' does not exist, so only using 'premium' model");
          this.loggedMissingRegularModelWarning = true;
        }

        modelSize = LLMModelQuality.PREMIUM;
      }
    }

    if (modelSize === LLMModelQuality.PREMIUM || modelSize === LLMModelQuality.REGULAR_PLUS) {
      if (!modelSizesSupported.includes(LLMModelQuality.PREMIUM)) {
        if (!this.loggedMissingPremiumModelWarning) {
          this.log("WARNING: Requested LLM completion model type of 'premium' does not exist, so only using 'reular' model");
          this.loggedMissingPremiumModelWarning = true;
        }

        modelSize = LLMModelQuality.REGULAR;
      }
    }

    return modelSize;
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
  private logErrWithContext(error: Error, context: LLMContext): void {
    console.error(error, error.stack);
    const errAsJson = JSON.stringify(error);

    if (errAsJson && errAsJson.length > 5) {
      this.log(JSON.stringify(error));
    }

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


  // Unit test hooks into private methods
  TEST_reducePromptSizeToTokenLimit = this.reducePromptSizeToTokenLimit;
}


export default LLMRouter;