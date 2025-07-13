import {
  LLMModelQuality,
  LLMCandidateFunction,
  LLMFunction,
  LLMProviderImpl,
} from "../../llm.types";
import { BadConfigurationLLMError } from "../../errors/llm-errors.types";

/**
 * Get completion candidates based on model quality override.
 */
export function getCompletionCandidates(
  completionCandidates: LLMCandidateFunction[],
  modelQualityOverride: LLMModelQuality | null,
): {
  candidatesToUse: LLMCandidateFunction[];
  candidateFunctions: LLMFunction[];
} {
  // Filter candidates based on model quality override if specified
  const candidatesToUse = modelQualityOverride
    ? completionCandidates.filter((candidate) => candidate.modelQuality === modelQualityOverride)
    : completionCandidates;

  if (candidatesToUse.length === 0) {
    throw new BadConfigurationLLMError(
      modelQualityOverride
        ? `No completion candidates found for model quality: ${modelQualityOverride}`
        : "No completion candidates available",
    );
  }

  const candidateFunctions = candidatesToUse.map((candidate) => candidate.func);
  return { candidatesToUse, candidateFunctions };
}

/**
 * Build completion candidates from the LLM provider.
 */
export function buildCompletionCandidates(llm: LLMProviderImpl): LLMCandidateFunction[] {
  const candidates: LLMCandidateFunction[] = [];

  // Add primary completion model as first candidate
  candidates.push({
    func: llm.executeCompletionPrimary.bind(llm),
    modelQuality: LLMModelQuality.PRIMARY,
    description: "Primary completion model",
  });

  // Add secondary completion model as fallback if available
  const availableQualities = llm.getAvailableCompletionModelQualities();
  if (availableQualities.includes(LLMModelQuality.SECONDARY)) {
    candidates.push({
      func: llm.executeCompletionSecondary.bind(llm),
      modelQuality: LLMModelQuality.SECONDARY,
      description: "Secondary completion model (fallback)",
    });
  }

  return candidates;
}
