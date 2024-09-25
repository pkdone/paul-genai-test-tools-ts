import { LLMStatsCategoryStatus, LLMStatsCategoriesSummary } from "../types/llm-types";


/**
 * Class for accumulating and tracking statistics of LLM invocation result types.
 */
class LLMStats {
  // Private fields
  private readonly doPrintEventTicks: boolean;
  private readonly statusTypes: Readonly<Record<string, LLMStatsCategoryStatus>> = {
    SUCCESS: { description: "LLM invocation suceeded", symbol: ">", count: 0 },
    FAILURE: { description: "LLM invocation failed so no data produced", symbol: "!", count: 0 },
    STEPUP: { description: "Stepped up to a premimum LLM to hopeully provide larger tokens limit", symbol: "+", count: 0 },
    RETRY: { description: "Retried calling LLM due to overload or network issue", symbol: "?", count: 0 },
    CROP: { description: "Cropping prompt due to excessive size, before resending", symbol: "-", count: 0 },
  } as const;


  /**
   * Constructor.
   */
  constructor(doPrintEventTicks: boolean) {
    this.doPrintEventTicks = doPrintEventTicks;
  }


  /**
   * Log success event occurrence and print its symbol
   */
  public recordSuccess(): void {
    this.record(this.statusTypes.SUCCESS);
  }


  /**
   * Log failure event occurrence and print its symbol
   */
  public recordFailure(): void {
    this.record(this.statusTypes.FAILURE);
  }


  /**
   * Log step-up event occurrence and print its symbol
   */
  public recordStepUp(): void {
    this.record(this.statusTypes.STEPUP);
  }


  /**
   * Log retry event occurrence and print its symbol
   */
  public recordRetry(): void {
    this.record(this.statusTypes.RETRY);
  }


  /**
   * Log reactive truncate event occurrence, capturing that a smaller size prompt is required by 
   * cropping, and print its symbol
   */
  public recordCrop(): void {
    this.record(this.statusTypes.CROP);
  }


  /**
   * Log success event occurrence and print its symbol
   */
  private record(statusType: LLMStatsCategoryStatus): void {
    statusType.count++;
    if (this.doPrintEventTicks) {
      console.log(statusType.symbol);
    }
  }


  /**
   * Get the currently accumulated statistics of LLM invocation result types.
   */
  public getStatusTypesStatistics(includeTotal: boolean = false): LLMStatsCategoriesSummary {
    const tableSnapshot = JSON.parse(JSON.stringify(this.statusTypes)); // DEEP-COPY HACK!

    if (includeTotal) {
      const total = tableSnapshot.SUCCESS.count + tableSnapshot.FAILURE.count;
      tableSnapshot.TOTAL = { description: "Total successes + failures", count: total };
    }

    return tableSnapshot;
  }  
}


export default LLMStats;
