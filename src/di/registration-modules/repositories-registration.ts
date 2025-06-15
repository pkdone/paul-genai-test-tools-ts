import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import SourcesRepository from "../../repositories/sources.repository";
import AppSummariesRepository from "../../repositories/app-summaries.repository";
import { ISourcesRepository } from "../../repositories/interfaces/sources.repository.interface";
import { IAppSummariesRepository } from "../../repositories/interfaces/app-summaries.repository.interface";

/**
 * Registers repositories in the DI container
 */
export function registerRepositories(): void {
  // Register repositories
  container.register<ISourcesRepository>(TOKENS.SourcesRepository, {
    useClass: SourcesRepository,
  });

  container.register<IAppSummariesRepository>(TOKENS.AppSummariesRepository, {
    useClass: AppSummariesRepository,
  });
} 