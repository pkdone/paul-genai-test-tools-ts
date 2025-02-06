/**
 * Type to define the control types
 */
export type PromiseFunction<T> = () => Promise<T>;

/**
 * Type to define the retry function
 */
export type RetryFunc<T> = (...args: unknown[]) => Promise<T>;

/**
 * Type to define the check result function
 */
export type CheckResultFunc<T> = (result: T) => boolean;

/**
 * Type to define the log retry event function
 */
export type LogRetryEventFunc = () => void;
