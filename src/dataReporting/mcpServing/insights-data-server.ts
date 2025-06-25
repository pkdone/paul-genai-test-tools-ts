import { injectable, inject } from "tsyringe";
import type { AppSummariesRepository } from "../../repositories/interfaces/app-summaries.repository.interface";
import type { AppSummaryNameDescArray } from "../../repositories/models/app-summary.model";
import { TOKENS } from "../../di/tokens";

/**
 * Class to handle analysis data server operations.
 */
@injectable()
export default class InsightsDataServer {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: AppSummariesRepository,
    private readonly projectName: string
  ) {
  }

  /**
   * Retrieves a list of business processes from the database.
   */
  async getBusinessProcesses(): Promise<{ name: string; description: string }[]> {
    const busProcesses = await this.appSummariesRepository.getProjectAppSummaryField<AppSummaryNameDescArray>(this.projectName, "busprocesses");    
    if (!busProcesses || !Array.isArray(busProcesses)) return [];
    return busProcesses.map(item => ({
      name: item.name || '',
      description: item.description || ''
    }));
  }
}