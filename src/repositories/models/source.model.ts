/**
 * Summary interface that includes all possible properties from for the LLM summarized source file
 */
export interface SourceFileSummary {
  readonly purpose: string;
  readonly implementation: string;
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
export interface SourceRecord {
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
 * Type for source file metadata, including project name, type, filepath, and content
 */
export type SourceMetataContentAndSummary = Pick<SourceRecord,
  "projectName" | "type" | "filepath" | "content" | "summary">;

/**
 * Type for source file's filepath and summary, excluding content
 */
export type SourceFilePathAndSummary = Pick<SourceRecord,
  "filepath" | "summary">;
