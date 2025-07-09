import { injectable, inject } from "tsyringe";
import type LLMRouter from "../core/llm-router";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { logErrorMsg, logErrorMsgAndDetail } from "../../common/utils/error-utils";
import { TOKENS } from "../../di/tokens";

/**
 * Injectable service for LLM utility operations with validation and retry logic.
 * Handles the common pattern of: LLM call -> validate -> retry with correction on failure.
 */
@injectable()
export class LLMStructuredResponseInvoker {
  constructor(@inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Main method to call LLM with validation and automatic retry on validation failure.
   * Handles the common pattern of: LLM call -> validate -> retry with correction on failure.
   */
  async getStructuredResponse<T>(
    resourceName: string,
    prompt: string,
    schema: z.ZodType<T>,
    taskLabel: string,
  ): Promise<T> {
    // Initial attempt, returning good LLM response if valid JSON according to schema
    const response = await this.callLLMErroringIfNotJSON(resourceName, prompt);
    const validation = schema.safeParse(response);
    if (validation.success) return validation.data;

    // Try to use the LLM to correct the LLM response and return that if valid
    logErrorMsgAndDetail(
      `Structured validation of the response for a particular schema failed for '${taskLabel}', so attempting self-correction with an the LLM...`,
      validation.error.format(),
    );
    const correctionPrompt = this.buildCorrectionPrompt(response, schema, validation.error);
    const correctedResponse = await this.callLLMErroringIfNotJSON(
      `${resourceName}-fix`,
      correctionPrompt,
    );
    const retryValidation = schema.safeParse(correctedResponse);
    if (retryValidation.success) {
      console.log(
        `Succeeded in using an LLM to fix the schema structured format for '${taskLabel}' and getting a corrected response`,
      );
      return retryValidation.data;
    }

    // Otherwise assume failure
    throw new Error(
      `Failed to get schema valid LLM schema structured response even after retry for ${taskLabel}: ${retryValidation.error.message}`,
    );
  }

  /**
   * Utility function to make LLM calls with consistent error handling and validation.
   * Ensures the response is a valid JSON object and throws descriptive errors on failure.
   */
  private async callLLMErroringIfNotJSON(
    resourceName: string,
    prompt: string,
  ): Promise<Record<string, unknown> | null> {
    const response = await this.llmRouter.executeCompletion(resourceName, prompt, true, {
      resource: resourceName,
      requireJSON: true,
    });

    if (Array.isArray(response) || typeof response !== "object" || response === null) {
      logErrorMsg(
        `Error - LLM response processing '${resourceName}' is not JSON - value returned was: ${JSON.stringify(response)}`,
      );
      throw new Error(`LLM returned non-object JSON for ${resourceName}: ${typeof response}`);
    }

    return response;
  }

  /**
   * Build a correction prompt for failed Zod validation.
   * This is shared across multiple LLM-based components that need self-correction.
   */
  private buildCorrectionPrompt<T>(
    originalResponse: unknown,
    schema: z.ZodType<T>,
    validationError: z.ZodError,
  ): string {
    return `The previous JSON response had schema validation errors. Please fix the following JSON to strictly match the provided schema.
---
ORIGINAL JSON:
${JSON.stringify(originalResponse)}
---
SCHEMA:
${JSON.stringify(zodToJsonSchema(schema), null, 2)}
---
VALIDATION ERRORS:
${JSON.stringify(validationError.format())}
---
Return ONLY the corrected, valid JSON object.`;
  }
}
