/**
 * Summary interface that includes all possible properties from the database
 */
export interface SourceFileSummary {
  readonly purpose?: string;
  readonly implementation?: string;
  readonly classpath?: string;
  readonly internalReferences?: readonly string[];
  readonly externalReferences?: readonly string[];
  readonly databaseIntegration?: {
    readonly mechanism: string;
    readonly description: string;
  };
  readonly storedProcedures?: {
    readonly name: string;
    readonly purpose: string;
    readonly complexity: "low" | "medium" | "high";
    readonly linesOfCode: number;
  }[];
  readonly triggers?: {
    readonly name: string;
    readonly purpose: string;
    readonly complexity: "low" | "medium" | "high";
    readonly linesOfCode: number;
  }[];
}

/**
 * Interface representing a source file record in the database
 */
export interface SourceFileRecord {
  readonly _id?: string;
  readonly projectName: string;
  readonly filename: string;
  readonly filepath: string;
  readonly type: string;
  readonly linesCount: number;
  readonly summary?: SourceFileSummary;
  readonly summaryError?: string;
  readonly summaryVector?: number[];
  readonly content: string;
  readonly contentVector?: number[];
}

/**
 * Interface for source file metadata used in queries
 */
export interface SourceFileShortInfo {
  readonly projectName: string;
  readonly type: string;
  readonly filepath: string;
  readonly content: string;
  readonly summary?: SourceFileSummary;
}

/**
 * Interface for source file summary information
 */
export interface SourceFileSummaryInfo {
  readonly filepath: string;
  readonly summary?: SourceFileSummary;
} 