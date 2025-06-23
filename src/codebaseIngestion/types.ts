/**
 * Base interface for file summary responses from LLM
 */
export interface BaseFileSummary {
  readonly purpose: string;
  readonly implementation: string;
  databaseIntegration: {
    readonly mechanism: string;
    readonly description: string;
  };
}

/**
 * Enhanced file summary for JavaScript/TypeScript files with additional reference information
 */
export interface JavaScriptFileSummary extends BaseFileSummary {
  readonly internalReferences: string[];
  readonly externalReferences: string[];
} 