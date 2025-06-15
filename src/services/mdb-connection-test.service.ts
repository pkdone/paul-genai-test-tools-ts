import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { getProjectNameFromPath } from "../utils/path-utils";
import { Service } from "../types/service.types";
import type { EnvVars } from "../types/env.types";
import type { ISourcesRepository } from "../repositories/interfaces/sources.repository.interface";
import { TOKENS } from "../di/tokens";

/**
 * Service to test the MongoDB connection.
 */
@injectable()
export class MDBConnectionTestService implements Service {
  /**
   * Constructor with dependency injection.
   */  
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: ISourcesRepository,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars
  ) {}

  /**
   * Execute the service - tests the MongoDB connection.
   */
  async execute(): Promise<void> {
    await this.testConnection(this.env.CODEBASE_DIR_PATH);
  }

  private async testConnection(srcDirPath: string): Promise<void> {
    const projectName = getProjectNameFromPath(srcDirPath);     
    const result = await this.sourcesRepository.getFilePaths(projectName);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
} 