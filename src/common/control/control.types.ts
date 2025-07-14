import { FailedAttemptError } from "p-retry";
import { LLMResponseStatus } from "../../llm/llm.types";

/**
 * Type to define the retry function with improved type safety using generics
 */
export type RetryFunc<TArgs extends unknown[], TReturn> = (...args: TArgs) => Promise<TReturn>;

/**
 * Type to define the check result function
 */
export type CheckResultThrowIfRetryFunc<T> = (result: T) => void;

/**
 * Type to define the log retry event function with status support
 */
export type LogRetryEventFunc = (
  error: FailedAttemptError & { status?: LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID },
) => void;
