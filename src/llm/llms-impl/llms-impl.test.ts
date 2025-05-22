import { RateLimitError, InternalServerError, APIError } from "openai";
import AzureOpenAI from "./openai/azure-openai-llm";
import { ModelKey, ModelFamily, modelFamilyToModelKeyMappings } from "../../types/llm-models-types";
import { extractTokensAmountFromMetadataDefaultingMissingValues, 
         extractTokensAmountAndLimitFromErrorMsg }  from "../llm-response-tools";

describe("Token extraction from error messages", () => {
  describe("AzureOpenAI", () => {
    test("extracts tokens from error message with completion tokens", () => {
      const errorMsg = "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.GPT_COMPLETIONS_GPT4, "dummy prompt", errorMsg))
       .toStrictEqual({
          "completionTokens": 5,
          "promptTokens": 10346,
          "maxTotalTokens": 8191
       });
    });

    test("extracts tokens from error message without completion tokens", () => {
      const errorMsg = "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.GPT_COMPLETIONS_GPT4, "dummy prompt", errorMsg))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 8545,
          "maxTotalTokens": 8192
       });
    });
  });

  describe("BedrockClaude", () => {
    test("extracts tokens from error message with max input tokens", () => {
      const errorMsg = "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1048576, request input token count: 1049999 ";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_CLAUDE_V35, "dummy prompt", errorMsg))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 1049999,
          "maxTotalTokens": 1048576
       });
    });

    test("extracts tokens from error message with maxLength", () => {
      const errorMsg = "ValidationException: Malformed input request: expected maxLength: 2097152, actual: 2300000, please reformat your input and try again.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_CLAUDE_V35, "dummy prompt", errorMsg))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 219346,
          "maxTotalTokens": 200000
       });
    });

    test("extracts tokens from generic too long error", () => {
      const errorMsg = "Input is too long for requested model.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_CLAUDE_V35, "dummy prompt", errorMsg))
       .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 200001,
          "maxTotalTokens": 200000
       });
    });
  });

  describe("BedrockLlama", () => {
    test("extracts tokens from error message for 70B model", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_LLAMA_V3_70B_INSTRUCT, "dummy prompt", errorMsg))
       .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 8193,
         "maxTotalTokens": 8192
       });
    }); 

    test("extracts tokens from error message for 405B model", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 128000 tokens. Please reduce the length of the prompt.";
      expect(extractTokensAmountAndLimitFromErrorMsg(ModelKey.AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT, "dummy prompt", errorMsg))
       .toStrictEqual({
         "completionTokens": 0,
         "promptTokens": 128001,
         "maxTotalTokens": 128000
       });
    }); 
  });
});

describe("Token extraction from metadata", () => {
  describe("AbstractLLM", () => {
    test("extracts tokens with missing maxTotalTokens", () => {
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.GPT_COMPLETIONS_GPT4_32k, tokenUsage))
        .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 200,
          "maxTotalTokens": 32768
      });
    });

    test("extracts tokens with missing completionTokens", () => {
      const tokenUsage = {
        promptTokens: 32760,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.GPT_COMPLETIONS_GPT4_32k, tokenUsage))
        .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 32760,
          "maxTotalTokens": 32768
      });
    });

    test("extracts tokens with missing promptTokens", () => {
      const tokenUsage = {
        promptTokens: -1,
        completionTokens: 200,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.GPT_COMPLETIONS_GPT4_32k, tokenUsage))
        .toStrictEqual({
          "completionTokens": 200,
          "promptTokens": 32569,
          "maxTotalTokens": 32768
      });
    });

    test("extracts tokens for different model", () => {
      const tokenUsage = {
        promptTokens: 243,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      expect(extractTokensAmountFromMetadataDefaultingMissingValues(ModelKey.AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT, tokenUsage))
        .toStrictEqual({
          "completionTokens": 0,
          "promptTokens": 243,
          "maxTotalTokens": 128000
      });
    });
  });
});

describe("OpenAI implementation", () => {
  describe("model management", () => {
    test("counts available models", () => {
      const llm = new AzureOpenAI(modelFamilyToModelKeyMappings[ModelFamily.AZURE_OPENAI_MODELS], "dummy key", "dummy endpoint", "dummy emb", "dummy prim", "dummy sec");
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });
  });

  describe("error handling", () => {
    test("detects rate limit error", () => {
      const llm = new AzureOpenAI(modelFamilyToModelKeyMappings[ModelFamily.AZURE_OPENAI_MODELS], "dummy key", "dummy endpoint", "dummy emb", "dummy prim", "dummy sec");
      const error = new RateLimitError(429, undefined, "Rate limit exceeded", {});
      expect(llm.TEST_isLLMOverloaded(error)).toBe(true);
    }); 

    test("detects internal server error", () => {
      const llm = new AzureOpenAI(modelFamilyToModelKeyMappings[ModelFamily.AZURE_OPENAI_MODELS], "dummy key", "dummy endpoint", "dummy emb", "dummy prim", "dummy sec");
      const error = new InternalServerError(429, undefined, "System overloaded", {});
      expect(llm.TEST_isLLMOverloaded(error)).toBe(true);
    }); 

    test("detects token limit exceeded with code", () => {
      const llm = new AzureOpenAI(modelFamilyToModelKeyMappings[ModelFamily.AZURE_OPENAI_MODELS], "dummy key", "dummy endpoint", "dummy emb", "dummy prim", "dummy sec");
      const error = new APIError(400, { code: "context_length_exceeded" }, "context_length_exceeded", undefined);
      expect(llm.TEST_isTokenLimitExceeded(error)).toBe(true);   
    }); 

    test("detects token limit exceeded with type", () => {
      const llm = new AzureOpenAI(modelFamilyToModelKeyMappings[ModelFamily.AZURE_OPENAI_MODELS], "dummy key", "dummy endpoint", "dummy emb", "dummy prim", "dummy sec");
      const error = new APIError(400, { type: "invalid_request_error" }, "context_length_exceeded", undefined);
      expect(llm.TEST_isTokenLimitExceeded(error)).toBe(true);   
    }); 
  });
});
