/**
 * Type to define the retry function with improved type safety using generics
 */
export type RetryFunc<TArgs extends unknown[], TReturn> = (...args: TArgs) => Promise<TReturn>;

/**
 * Type to define the check result function
 */
export type CheckResultFunc<T> = (result: T) => boolean;

/**
 * Type to define the log retry event function
 */
export type LogRetryEventFunc = () => void;
