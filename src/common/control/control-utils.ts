import pRetry from "p-retry";
import { RetryFunc, CheckResultFunc, LogRetryEventFunc } from "./control.types";

interface FailedAttemptError extends Error {
  readonly attemptNumber: number;
  readonly retriesLeft: number;
}

interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  onFailedAttempt?: (error: FailedAttemptError) => void;
}

/**
 * Generic retry mechanism for asynchronous functions using exponential backoff.
 * It wraps the `p-retry` library to provide a consistent retry strategy.
 *
 * @param asyncTryFunc The asynchronous function to retry.
 * @param args Arguments to pass to the async function (now strongly typed).
 * @param checkResultForNeedToRetryFunc A function that takes the result and decides whether to retry.
 * @param logRetryEventFunc Function to call to record the retry event (optional).
 * @param maxAttempts Maximum number of attempts.
 * @param minRetryDelay Minimum delay between retries in milliseconds.
 * @returns The result of the asynchronous function, if successful.
 * @throws {Error} if all retry attempts fail.
 */
export async function withRetry<TArgs extends unknown[], TReturn>(
  asyncTryFunc: RetryFunc<TArgs, TReturn>,
  args: TArgs,
  checkResultForNeedToRetryFunc: CheckResultFunc<TReturn>,
  logRetryEventFunc: LogRetryEventFunc | null = null,
  maxAttempts = 3,
  minRetryDelay = 7000,
): Promise<TReturn | null> {
  try {
    return await pRetry(
      async () => {
        const result = await asyncTryFunc(...args);

        if (checkResultForNeedToRetryFunc(result)) {
          // Throwing an error triggers a retry by p-retry
          throw new Error("Result indicates a retry is needed.");
        }

        return result;
      },
      {
        retries: maxAttempts - 1, // p-retry uses `retries` (number of retries, not total attempts)
        minTimeout: minRetryDelay,
        onFailedAttempt: (_error: FailedAttemptError) => {
          void _error; // Keep _error around in case useful for debugging
          if (logRetryEventFunc) logRetryEventFunc();
        },
      } as RetryOptions,
    );
  } catch {
    // p-retry throws if all attempts fail. We can catch it and return null to match previous behavior.
    //console.error("All retry attempts failed");
    return null;
  }
}
