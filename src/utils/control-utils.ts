import { PromiseFunction, RetryFunc, CheckResultFunc, LogRetryEventFunc }
  from "../types/control-types";


/**
 * Executes a given array of task promise functions in batches, limiting the number of concurrent 
 * tasks based on the specified maximum concurrency. It ensures that no more than the defined
 * number of tasks are running at the same time. This can be useful to avoid overloading a system
 * or hitting rate limits on APIs.
 * 
 * @param tasks An array of function promises that each return values.
 * @param maxConcurrency The maximum number of tasks to be executed concurrently.
 * @returns A promise that resolves to an array of the results from the input tasks.
 */
export async function promiseAllThrottled<T>(
  tasks: PromiseFunction<T>[],
  maxConcurrency: number = 100
): Promise<T[]> {
  const results: T[] = [];
  const totalTasks = tasks.length;

  while (tasks.length) {
    console.log(`Processing next batch of ${Math.min(tasks.length, maxConcurrency)} tasks (already processed: ${totalTasks - tasks.length} of ${totalTasks} tasks)`);
    const batch = tasks.splice(0, maxConcurrency).map(f => f());
    results.push(...await Promise.all(batch));
  }

  return results;
}


/**
 * Generic retry mechanism for asynchronous functions. For each attempt, the function waits
 * longer (multiple x minRetryDelay) before the next retry. Any errors from asyncTryFunc are rethrown
 * immediately, stopping retries. If asyncTryFunc times out and there are no more attempts left, 
 * the function returns `undefined` to indicate that asyncTryFunc never successfully completed.
 * 
 * @template T The type of the result that the `asyncTryFunc` is expected to return.* 
 * @param asyncTryFunc The asynchronous function to retry.
 * @param args Arguments to pass to the async function.
 * @param checkResultForNeedToRetryFunc A function that takes the result and decides whether to retry.
 * @param logRetryEventFunc Function to call to record the retry event (optional).
 * @param maxAttempts Maximum number of attempts.
 * @param minRetryDelay Minimum delay between retries in milliseconds.
 * @param maxRetryAdditionalDelay Maximum additional random delay to add in milliseconds.
 * @param waitTimeout Time in milliseconds to wait for asyncTryFunc to run before timing out.
 * @param logTimeouts Whether to log a message to the console when a timeout occurs.
 * @returns The result of the asynchronous function, if successful, otherwise `undefined`.
 */
export async function withRetry<T>(
  asyncTryFunc: RetryFunc<T>,
  args: unknown[],
  checkResultForNeedToRetryFunc: CheckResultFunc<T>,
  logRetryEventFunc: LogRetryEventFunc | null = null,
  maxAttempts: number = 3,
  minRetryDelay: number = 10000,
  maxRetryAdditionalDelay: number = 10000,
  waitTimeout: number = 300000,
  logTimeouts: boolean = true
): Promise<T | null> {

  let attempts = 0;
  let result: T | null = null;

  while (attempts < maxAttempts) {  
    result = await executeFunctionWithTimeout<T>(waitTimeout, asyncTryFunc, args, logTimeouts);

    if (!result || checkResultForNeedToRetryFunc(result)) {
      logRetryEventFunc?.();
      attempts++;

      if (attempts < maxAttempts) {
        const delayMillis = minRetryDelay * Math.min(attempts, 3) + Math.random() * maxRetryAdditionalDelay;
        await new Promise(resolve => setTimeout(resolve, delayMillis));
      }
    } else {
      break;
    }
  }

  return result;
}


/**
 * Executes an asynchronous function with a specified timeout.
 * If the function does not resolve within the timeout period, it rejects with a RetryableTimeoutError.
 * If the function resolves successfully before the timeout, it returns the result.
 * If an error other than RetryableTimeoutError occurs, the error is thrown and must be caught by the caller.
 *
 * @template T The type of the result that the `asyncTryFunc` is expected to return.
 * @param {number} waitTimeout - The maximum time (in milliseconds) to wait for the `asyncTryFunc` to complete.
 * @param {RetryFunc<T>} asyncTryFunc - The asynchronous function to attempt, which can be any function returning a Promise<T>.
 * @param {unknown[]} args - Arguments to pass to the `asyncTryFunc`.
 * @param {boolean} logTimeouts - If true, logs timeout errors to the console.
 * @returns {Promise<T | undefined>} A promise that resolves with the function's return value or undefined if a timeout occurs.
 * @throws {Error} Any error other than RetryableTimeoutError is thrown to be handled by the caller.
 */
async function executeFunctionWithTimeout<T>(
  waitTimeout: number,
  asyncTryFunc: RetryFunc<T>,
  args: unknown[],
  logTimeouts: boolean
): Promise<T | null> {
  class RetryableTimeoutError extends Error { };
  let timeoutHandle: NodeJS.Timeout | null = null;
  let result: T | null = null;

  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => reject(new RetryableTimeoutError()), waitTimeout);
    });

    result = await Promise.race([asyncTryFunc(...args), timeoutPromise]);
  } catch (error) {
    if (error instanceof RetryableTimeoutError) {
      if (logTimeouts) {
        console.error("<retryable timeout error>");
      }
    } else {
      throw error;
    }
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }

  return result;
}

