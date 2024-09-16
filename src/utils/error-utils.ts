/**
 * Function to get the error text from a thrown variable which may or may not be an Error object.
 */
export function getErrorText(error: unknown): string {
  if (!error) {
    return "No error message available";
  } else if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "object") {
    return "message" in error ? (error as { message: string }).message : JSON.stringify(error);
  } else {
    return String(error);
  }
}


/**
 * Function to get the stack trace from a thrown variable if it is an Error object otherwise get
 * the current stack.
 */
export function getErrorStack(obj: unknown): string {
  if (obj instanceof Error && obj.stack) {
    return obj.stack;
  } else {
    return new Error().stack ?? 'No stack trace available';
  }
}
