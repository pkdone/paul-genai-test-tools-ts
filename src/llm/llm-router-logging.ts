import { LLMContext } from "..//types/llm-types";
import { getErrorStack, getErrorText } from "../utils/error-utils";


/**
 * Log info/error text to the console or a redirected-to file
 */
export function log(text: string): void {
  console.log(text);
}


/**
 * Log both the error content and also any context associated with work being done when the 
 * error occurred, add the context to the error object and then throw the augmented error.
 */
export function logErrWithContext(error: unknown, context: LLMContext): void {
  console.error(getErrorText(error), getErrorStack(error));
  logContext(context);
}


/**
 * Log the message and the associated context keys and values.
 */
export function logWithContext(msg: string, context: LLMContext): void {
  log(msg);
  logContext(context);
}


/**
 * Log the context keys and values.
 */
export function logContext(context: LLMContext): void {
  if (context) {
    if (typeof context === "object" && !Array.isArray(context)) {
      for (const [key, value] of Object.entries(context)) {
        log(`  * ${key}: ${value}`);
      }
    } else {
      log(`  * ${JSON.stringify(context)}`);
    }
  }
}
