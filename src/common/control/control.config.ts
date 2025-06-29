/**
 * Control utilities configuration for retry mechanisms and timeouts.
 */
export const controlConfig = {
  DEFAULT_MAX_ATTEMPTS: 3 as number,
  DEFAULT_MIN_RETRY_DELAY: 7000 as number,
  DEFAULT_MAX_RETRY_ADDITIONAL_DELAY: 3000 as number,
  DEFAULT_WAIT_TIMEOUT: 300000 as number,
  DEFAULT_MAX_CONCURRENCY: 100 as number,
} as const;
