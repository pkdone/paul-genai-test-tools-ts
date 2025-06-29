import { injectable, inject } from "tsyringe";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import { TOKENS } from "../../../di/tokens";

/**
 * Class to handle analysis data server operations.
 */
@injectable()
export default class InsightsDataServer {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
  ) {}

  /**
   * Retrieves a list of business processes from the database.
   */
  async getBusinessProcesses(): Promise<{ name: string; description: string }[]> {
    const busProcesses = await this.appSummariesRepository.getProjectAppSummaryField(
      this.projectName,
      "businessProcesses",
    );
    if (!busProcesses || !Array.isArray(busProcesses)) return [];
    return busProcesses.map((item) => ({
      name: (item as { name?: string }).name ?? "",
      description: (item as { description?: string }).description ?? "",
    }));
  }
}
