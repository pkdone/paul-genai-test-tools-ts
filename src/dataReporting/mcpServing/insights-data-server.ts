import { injectable, inject } from "tsyringe";
import type { IAppSummariesRepository } from "../../repositories/interfaces/app-summaries.repository.interface";
import { TOKENS } from "../../di/tokens";

// Interface for business process item
interface BusinessProcess {
  name: string;
  description: string;
}

/**
 * Class to handle analysis data server operations.
 */
@injectable()
export default class InsightsDataServer {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository) private readonly appSummariesRepository: IAppSummariesRepository,
    private readonly projectName: string
  ) {
  }

  /**
   * Retrieves a list of business processes from the database.
   */
  async getBusinessProcesses(): Promise<BusinessProcess[]> {
    const busProcesses = await this.appSummariesRepository.getAppSummaryField<BusinessProcess[]>(this.projectName, "busprocesses");
    
    if (!busProcesses || !Array.isArray(busProcesses)) {
      return [];
    }
    
    return busProcesses.map(item => {
      if ('name' in item && 'description' in item) {
        const nameValue = item.name;
        const descValue = item.description;
        return {
          name: (typeof nameValue === 'string' || typeof nameValue === 'number') ? String(nameValue) : '',
          description: (typeof descValue === 'string' || typeof descValue === 'number') ? String(descValue) : ''
        };
      }
      return { name: '', description: '' };
    });
  }
}