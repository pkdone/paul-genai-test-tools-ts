import { DependencyContainer } from "tsyringe";

/**
 * Configuration for a single dependency in the factory
 */
export interface DependencyConfig {
  /** The token to resolve this dependency */
  token: symbol;
  /** Whether this dependency is async and needs to be awaited */
  isAsync: boolean;
}

/**
 * Factory function type that creates an instance with resolved dependencies
 */
export type AsyncFactoryFunction<T> = (container: DependencyContainer) => Promise<T>;

/**
 * Constructor type for classes that can be instantiated with dependencies
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Creates an async factory function for registering classes that depend on async dependencies like LLMRouter.
 * This abstracts the repetitive pattern of manually resolving dependencies in useFactory functions.
 * 
 * @param ClassConstructor The class constructor to instantiate
 * @param dependencies Array of dependency configurations specifying tokens and async nature
 * @returns An async factory function that can be used in container.register()
 * 
 * @example
 * // Before: Manual factory with repetitive code
 * container.register(TOKENS.MyService, {
 *   useFactory: async (c) => {
 *     const llmRouter = await c.resolve<Promise<LLMRouter>>(TOKENS.LLMRouter);
 *     const repo = c.resolve<Repository>(TOKENS.Repository);
 *     return new MyService(llmRouter, repo);
 *   },
 * });
 * 
 * // After: Using the helper
 * container.register(TOKENS.MyService, {
 *   useFactory: createAsyncFactory(MyService, [
 *     { token: TOKENS.LLMRouter, isAsync: true },
 *     { token: TOKENS.Repository, isAsync: false }
 *   ])
 * });
 */
export function createAsyncFactory<T>(
  ClassConstructor: Constructor<T>,
  dependencies: DependencyConfig[]
): AsyncFactoryFunction<T> {
  return async (container: DependencyContainer): Promise<T> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolvedDependencies: any[] = [];

    // Resolve all dependencies in the order they were specified
    for (const dep of dependencies) {
      if (dep.isAsync) {
        // Await async dependencies (like LLMRouter)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const asyncDep = await container.resolve<Promise<any>>(dep.token);
        resolvedDependencies.push(asyncDep);
      } else {
        // Resolve sync dependencies directly
        const syncDep = container.resolve(dep.token);
        resolvedDependencies.push(syncDep);
      }
    }

    // Instantiate the class with all resolved dependencies
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new ClassConstructor(...resolvedDependencies);
  };
}

/**
 * Convenience function to create a dependency configuration
 */
export function dep(token: symbol, isAsync = false): DependencyConfig {
  return { token, isAsync };
}

/**
 * Convenience function to create an async dependency configuration (commonly LLMRouter)
 */
export function asyncDep(token: symbol): DependencyConfig {
  return { token, isAsync: true };
}

/**
 * Convenience function to create a sync dependency configuration
 */
export function syncDep(token: symbol): DependencyConfig {
  return { token, isAsync: false };
} 