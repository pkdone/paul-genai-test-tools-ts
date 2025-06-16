import { Double } from "mongodb";
import { SourceFileRecord, SourceFileShortInfo, SourceFileSummaryInfo } from "../models/source.model";

/**
 * Interface for the Sources repository
 */
export interface ISourcesRepository {
  /**
   * Insert a source file record into the database
   */
  insertSourceFile(sourceFileData: Omit<SourceFileRecord, "_id">): Promise<void>;

  /**
   * Delete all source files for a specific project
   */
  deleteSourceFilesByProject(projectName: string): Promise<void>;

  /**
   * Check if a source file already exists for a project
   */
  doesSourceFileExist(projectName: string, filepath: string): Promise<boolean>;

  /**
   * Get source file summaries for a project
   */
  getSourceFileSummaries(projectName: string, fileTypes: string[]): Promise<SourceFileSummaryInfo[]>;

  /**
   * Get database integration information for a project
   */
  getDatabaseIntegrations(projectName: string, fileTypes: string[]): Promise<{
    path: string;
    mechanism: string;
    description: string;
  }[]>;

  /**
   * Get stored procedures and triggers information for a project
   */
  getStoredProceduresAndTriggers(projectName: string, fileTypes: string[]): Promise<SourceFileSummaryInfo[]>;

  /**
   * Perform vector search on source file content
   */
  vectorSearchContent(
    projectName: string, 
    fileType: string, 
    queryVector: Double[], 
    numCandidates: number, 
    limit: number
  ): Promise<SourceFileShortInfo[]>;

  /**
   * Get file paths for a specific project (used for testing)
   */
  getFilePaths(projectName: string): Promise<string[]>;

  /**
   * Get file count for a project
   */
  getFileCount(projectName: string): Promise<number>;

  /**
   * Get total lines of code for a project
   */
  getTotalLinesOfCode(projectName: string): Promise<number>;
} 