import { injectable, inject } from "tsyringe";
import { fileSystemConfig } from "../config";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import { TOKENS } from "../di/tokens";

// Enum for stored procedure complexity levels
enum Complexity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}





// Interface for the database interaction list
interface ProcsAndTriggers {
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

/**
 * Class responsible for querying code metadata from the database.
 */
@injectable()
export default class DBCodeMetadataQueryer {
  /**
   * Constructor
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    private readonly projectName: string
  ) {
  }

  /**
   * Returns a list of source file summaries with basic info.
   */
  async buildSourceFileListSummaryList() {
    const srcFilesList: string[] = [];
    const records = await this.sourcesRepository.getSourceFileSummaries(this.projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);

    for (const record of records) {
      const { summary } = record;

      if (!summary || Object.keys(summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = summary.classpath ?? record.filepath;
      srcFilesList.push(`* ${fileLabel}: ${summary.purpose ?? ""} ${summary.implementation ?? ""}`);
    }
    
    return srcFilesList;
  }

  /**
   * Returns a list of database integrations.
   */
  async buildDBInteractionList() {
    return await this.sourcesRepository.getDatabaseIntegrations(this.projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers.
   */
  async buildDBStoredProcsTriggersSummaryList() {
    const procsAndTriggers: ProcsAndTriggers = {
      procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
    };
    
    const records = await this.sourcesRepository.getStoredProceduresAndTriggers(this.projectName, [...fileSystemConfig.SOURCE_FILES_FOR_CODE]);

    for (const record of records) {
      const { summary } = record;
      
      if (!summary) {
        console.log(`No stored procs / triggers summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      // Process stored procedures
      for (const sp of summary.storedProcedures ?? []) {
        procsAndTriggers.procs.total++;
        this.incrementComplexityCount(procsAndTriggers.procs, sp.complexity as Complexity);
        procsAndTriggers.procs.list.push({
          path: record.filepath,
          type: "STORED PROCEDURE",
          functionName: sp.name,
          complexity: sp.complexity as Complexity,
          linesOfCode: sp.linesOfCode,
          purpose: sp.purpose,
        });
      }

      // Process triggers
      for (const trig of summary.triggers ?? []) {
        procsAndTriggers.trigs.total++;
        this.incrementComplexityCount(procsAndTriggers.trigs, trig.complexity as Complexity);
        procsAndTriggers.trigs.list.push({
          path: record.filepath,
          type: "TRIGGER",
          functionName: trig.name,
          complexity: trig.complexity as Complexity,
          linesOfCode: trig.linesOfCode,
          purpose: trig.purpose,
        });
      }
    }

    return procsAndTriggers;
  }

  /**
   * Increment the complexity count on a procs/trigs section.
   */
  private incrementComplexityCount(
    section: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    complexity: Complexity
  ) {
    switch (complexity) {
      case Complexity.LOW:
        section.low++;
        break;
      case Complexity.MEDIUM:
        section.medium++;
        break;
      case Complexity.HIGH:
        section.high++;
        break;
    }
  }
}


