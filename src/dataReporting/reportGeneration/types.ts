// Enum for stored procedure complexity levels
export enum Complexity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Type guard to check if a value is a valid Complexity enum value
 */
export function isComplexity(value: unknown): value is Complexity {
  return typeof value === 'string' && Object.values(Complexity).includes(value.toLowerCase() as Complexity);
}

// Interface for the database interaction list
export interface ProcsAndTriggers {
  procs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: {
      path: string;
      type: string;
      functionName: string;
      complexity: Complexity;
      linesOfCode: number;
      purpose: string;
    }[];
  };
  trigs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: {
      path: string;
      type: string;
      functionName: string;
      complexity: Complexity;
      linesOfCode: number;
      purpose: string;
    }[];
  };
}

// Interface for app statistics data
export interface AppStatistics {
  projectName: string;
  currentDate: string;
  llmProvider: string;
  fileCount: number;
  linesOfCode: number;
  appDescription: string;
}