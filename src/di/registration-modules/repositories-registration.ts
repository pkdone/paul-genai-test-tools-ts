import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import SourcesRepositoryImpl from "../../repositories/impl/sources.repository";
import AppSummariesRepositoryImpl from "../../repositories/impl/app-summaries.repository";
import { SourcesRepository } from "../../repositories/interfaces/sources.repository.interface";
import { AppSummariesRepository } from "../../repositories/interfaces/app-summaries.repository.interface";

/**
 * Registers repositories in the DI container
 */
export function registerRepositories(): void {
  // Register repositories
  container.register<SourcesRepository>(TOKENS.SourcesRepository, {
    useClass: SourcesRepositoryImpl,
  });

  container.register<AppSummariesRepository>(TOKENS.AppSummariesRepository, {
    useClass: AppSummariesRepositoryImpl,
  });
} 