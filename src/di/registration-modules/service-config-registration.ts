import { TOKENS } from "../tokens";
import { ServiceRunnerConfig } from "../../types/service.types";

/**
 * Service configuration mapping that defines what resources each service requires
 */
const SERVICE_CONFIGURATIONS = new Map<symbol, ServiceRunnerConfig>([
  // Main application services that require both MongoDB and LLM
  [TOKENS.CodebaseCaptureService, { requiresMongoDB: true, requiresLLM: true }],
  [TOKENS.CodeQueryService, { requiresMongoDB: true, requiresLLM: true }],
  [TOKENS.InsightGenerationService, { requiresMongoDB: true, requiresLLM: true }],
  [TOKENS.InsightsMcpServerService, { requiresMongoDB: true, requiresLLM: true }],
  
  // Services with specific requirements
  [TOKENS.InlineInsightsService, { requiresMongoDB: false, requiresLLM: true }],
  [TOKENS.MDBConnectionTestService, { requiresMongoDB: true, requiresLLM: false }],
  [TOKENS.PluggableLLMsTestService, { requiresMongoDB: false, requiresLLM: true }],
  [TOKENS.ReportGenerationService, { requiresMongoDB: true, requiresLLM: false }]
]);

/**
 * Get service configuration for a given service token
 */
export function getServiceConfiguration(serviceToken: symbol): ServiceRunnerConfig {
  const config = SERVICE_CONFIGURATIONS.get(serviceToken);
  if (!config) {
    throw new Error(`No configuration found for service token: ${serviceToken.toString()}`);
  }
  return config;
} 