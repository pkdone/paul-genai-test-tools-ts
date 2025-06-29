import "reflect-metadata";
import { bootstrapContainer } from "./di/container";
import { runService } from "./app/service-runner";
import { getServiceConfiguration } from "./di/registration-modules/service-config-registration";

/**
 * Main application entry point that orchestrates the two distinct phases:
 * 1. Bootstrap phase: Set up the DI container with required dependencies
 * 2. Run phase: Execute the specified service using the bootstrapped container
 */
export async function runApplication(serviceToken: symbol): Promise<void> {
  // Phase 1: Bootstrap - Set up the DI container
  const config = getServiceConfiguration(serviceToken);
  await bootstrapContainer(config);
  
  // Phase 2: Run - Execute the service using the bootstrapped container
  await runService(serviceToken);
}
