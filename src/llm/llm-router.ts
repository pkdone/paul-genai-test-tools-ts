import { llmConst } from "../types/llm-constants";
import { withRetry } from "../utils/control-utils";
import { LLMProviderImpl, LLMContext, LLMFunction, LLMModelSize, LLMInvocationPurpose,
         LLMResponseStatus, LLMGeneratedContent, LLMFunctionResponse, LLMResponseTokensUsage } 
  from "../types/llm-types";
import LLMStats from "./llm-stats";
import OpenAIGPT from "./llms-impl/openai-gpt";
import AzureOpenAIGPT from "./llms-impl/azure-openai-gpt";
import { GcpVertexAIGemini } from "./llms-impl/gcp-vertexai-gemini";
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
  private loggedMissingSmallModelWarning: boolean;
  private loggedMissingLargeModelWarning: boolean;


  /**
   * Constructor.
   */
  constructor(llmProviderName: string, doLogLLMInvocationEvents: boolean) {
    this.llmProviderName = llmProviderName;
    this.llmImpl = this.initializeLLMImplementation(llmProviderName);
    this.llmStats = new LLMStats(doLogLLMInvocationEvents);
    this.doLogEachResource = false;
    this.loggedMissingSmallModelWarning = false;
    this.loggedMissingLargeModelWarning = false;
    this.log(`Initiated LLM(s) from: ${this.llmProviderName}`);
  }

  
  /**
   * Load the appropriate class for the required LLM provider.
   */
  private initializeLLMImplementation(providerName: string): LLMProviderImpl {
    switch (providerName) {
      case llmConst.OPENAI_GPT_LLM: return new OpenAIGPT();
      case llmConst.AZURE_OPENAI_GPT_LLM: return new AzureOpenAIGPT();
      case llmConst.GCP_VERTEXAI_GEMINI_LLM: return new GcpVertexAIGemini();
      case llmConst.AWS_BEDROCK_TITAN_LLM: return new AWSBedrockTitan();
      case llmConst.AWS_BEDROCK_CLAUDE_LLM: return new AWSBedrockClaude();
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
    const { embeddings, small, large } = this.llmImpl.getModelsNames();
    return `${this.llmProviderName} (embeddings: ${embeddings}, completions-small: ${small}, completions-large: ${large})`;
  }  


  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async generateEmbeddings(resourceName: string, content: string, context: LLMContext = {}, autoTruncateAtSize: number = 0): Promise<LLMGeneratedContent> {
    context.purpose = LLMInvocationPurpose.EMBEDDINGS;
    const llmFunc: LLMFunction = this.llmImpl.generateEmbeddings.bind(this.llmImpl);
    return await this.invokeLLMWithRetriesAndAdaptation(resourceName, content, context, [llmFunc]);
  }


  /**
   * Send the prompt to the LLM for a particular model context size and retrieve the LLM's answer.
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  public async executeCompletion(resourceName: string, prompt: string, modelSize: LLMModelSize, doReturnJSON: boolean = false, context: LLMContext = {}, autoTruncateAtSize: number = 0): Promise<LLMGeneratedContent> {
    context.purpose = LLMInvocationPurpose.COMPLETION;
    const modelSizesSupported: LLMModelSize[] = this.llmImpl.getAvailableCompletionModelSizes();
    modelSize = this.adjustModelSizesBasedOnAvailability(modelSizesSupported, modelSize);
    context.model = (modelSize === LLMModelSize.SMALL_PLUS) ? LLMModelSize.SMALL : modelSize;
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

        if (!llmResponse) {
          llmResponse = { status: LLMResponseStatus.OVERLOADED, request: prompt, context };
        }

        if (llmResponse.status === LLMResponseStatus.COMPLETED) {
          result = llmResponse.generated || null;
          this.llmStats.recordSuccess();
          break;
        } else if (llmResponse.status === LLMResponseStatus.EXCEEDED || llmResponse.status === LLMResponseStatus.OVERLOADED) {
          if (llmResponse.status === LLMResponseStatus.EXCEEDED) {
            this.logWithContext(`LLM prompt token size ${llmResponse.tokensUage?.promptTokens} and completion token size ${llmResponse.tokensUage?.completionTokens} exceeded limit (total limit is ${llmResponse.tokensUage?.totalTokens} - this value might be lower than the LLM's max token limit to reflect that its internal completions limit was hit)`, context);
          } else {
            this.logWithContext(`LLM problem processing prompt for completion with current LLM model because it is overloaded or timing out (even after retries)`, context);
          }

          // If 'totalTokens'' specified, and no bigger LLMs available, then need to get drastic and
          // try cropping the prompt, even if LLM signalled 'overload' not 'exceeded'.
          // For most LLM implmentations 'totalTokens' will only be present if 'exceeded' and not
          // 'overladed', but GCP LLM is an exception.
          if (llmResponse.tokensUage?.totalTokens && (llmFuncIndex + 1) >= llmFuncs.length) { 
            const percentToReduce = (llmResponse.status === LLMResponseStatus.EXCEEDED) ? llmConst.TOKEN_LIMIT_SAFETY_CHARS_BUFFER_PERCENTAGE : llmConst.TOKEN_GUESS_REDUCTION_PERCENTAGE;
            currentPrompt = this.reducePromptSizeToTokenLimit(currentPrompt, llmResponse.tokensUage, percentToReduce);
            this.llmStats.recordCrop();
            continue;  // Don't attempt to move up to next [non-existent] LLM size - want to try current LLM with ths cut down prompt size
          }  
        } else {
          throw new Error(`An unknown error occurred while attempting to process prompt for completion for resource '${resourceName}'`);
        }

        context.model = LLMModelSize.LARGE;
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
  private reducePromptSizeToTokenLimit(prompt: string, tokensUage: LLMResponseTokensUsage, percentReduction: number): string {
    const charsPerToken = prompt.length / tokensUage.promptTokens;
    const charsLimit = tokensUage.totalTokens * charsPerToken;
    const completionCharsNeeded = Math.max(
      (llmConst.RESERVED_COMPLETION_MIN_TOKENS - tokensUage.completionTokens),
      (tokensUage.completionTokens * llmConst.COMPLETION_TOKEN_MIN_RATIO)
    ) * charsPerToken;
    const promptCharsAvailableNoBuffer = charsLimit - completionCharsNeeded;
    const promptCharsAvailable = Math.max(
      Math.floor((100 - percentReduction) / 100 * promptCharsAvailableNoBuffer),
      llmConst.MINIMUM_CHARS_FOR_PROMPT
    );
    return prompt.substring(0, promptCharsAvailable);
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
  private getModelSizeCompletionFunctions(modelSize: LLMModelSize): LLMFunction[] {
    const modelFuncs = [];
    
    if (modelSize === LLMModelSize.SMALL) {
      modelFuncs.push(this.llmImpl.executeCompletionSmall.bind(this.llmImpl));
    } else if (modelSize === LLMModelSize.LARGE) {
      modelFuncs.push(this.llmImpl.executeCompletionLarge.bind(this.llmImpl));
    } else if (modelSize === LLMModelSize.SMALL_PLUS) {
      modelFuncs.push(this.llmImpl.executeCompletionSmall.bind(this.llmImpl));
      modelFuncs.push(this.llmImpl.executeCompletionLarge.bind(this.llmImpl));
    }
    
    return modelFuncs;
  }


  /**
   * Adjust the model size based on availability and log warnings if necessary.
   */
  private adjustModelSizesBasedOnAvailability(modelSizesSupported: LLMModelSize[], modelSize: LLMModelSize): LLMModelSize {
    if (!modelSizesSupported || modelSizesSupported.length <= 0) {
      throw new Error("The LLM implementation doesn't implement a completions model of any size");
    }

    if (modelSize === LLMModelSize.SMALL || modelSize === LLMModelSize.SMALL_PLUS) {
      if (!modelSizesSupported.includes(LLMModelSize.SMALL)) {
        if (!this.loggedMissingSmallModelWarning) {
          this.log("WARNING: Requested LLM completion model size of small does not exist, so only using large size model");
          this.loggedMissingSmallModelWarning = true;
        }

        modelSize = LLMModelSize.LARGE;
      }
    }

    if (modelSize === LLMModelSize.LARGE || modelSize === LLMModelSize.SMALL_PLUS) {
      if (!modelSizesSupported.includes(LLMModelSize.LARGE)) {
        if (!this.loggedMissingLargeModelWarning) {
          this.log("WARNING: Requested LLM completion model size of large does not exist, so only using small size model");
          this.loggedMissingLargeModelWarning = true;
        }

        modelSize = LLMModelSize.SMALL;
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