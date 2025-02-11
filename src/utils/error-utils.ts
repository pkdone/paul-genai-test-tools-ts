/**
 * Log an error message and the error stack to the console.
 */
export function logErrorMsgAndDetail(msg: string | null, error: unknown) {
  if (msg) {
    console.error(msg, getErrorText(error), "-", getErrorStack(error));
  } else {
    console.error(getErrorText(error), "-", getErrorStack(error));    
  }
}

/**
 * Log an error and its stack to the console.
 */
export function logErrorDetail(error: unknown) {
  logErrorMsgAndDetail(null, error);
}

/**
 * Get the error text from a thrown variable which may or may not be an Error object.
 */
export function getErrorText(error: unknown) {
  if (!error) {
    return "No error message available";
  } else if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "object") {
    return "message" in error ? (error as { message: string }).message : JSON.stringify(error);
  } else {
    return JSON.stringify(error);
  }
}

/**
 * Get the stack trace from a thrown variable if it is an Error object otherwise get the current
 * stack.
 */
export function getErrorStack(obj: unknown) {
  if (obj instanceof Error && obj.stack) {
    return obj.stack;
  } else {
    return new Error().stack ?? 'No stack trace available';
  }
}
