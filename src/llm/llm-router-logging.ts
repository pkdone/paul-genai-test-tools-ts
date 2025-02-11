import { LLMContext } from "..//types/llm-types";
import { logErrorDetail } from "../utils/error-utils";

/**
 * Log info/error text to the console or a redirected-to file
 */
export function log(text: string) {
  console.log(text);
}

/**
 * Log both the error content and also any context associated with work being done when the 
 * error occurred, add the context to the error object and then throw the augmented error.
 */
export function logErrWithContext(error: unknown, context: LLMContext) {
  logErrorDetail(error);  
  logContext(context);
}

/**
 * Log the message and the associated context keys and values.
 */
export function logWithContext(msg: string, context: LLMContext) {
  log(msg);
  logContext(context);
}

/**
 * Log the context keys and values.
 */
export function logContext(context: LLMContext) {
  if ((context instanceof Object) && !Array.isArray(context)) {
    for (const [key, value] of Object.entries(context)) {
      log(`  * ${key}: ${String(value)}`);
    }
  } else {
    log(`  * ${JSON.stringify(context)}`);
  }
}
