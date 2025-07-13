import {
  LLMModelQuality,
  LLMCandidateFunction,
  LLMFunction,
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
    ? completionCandidates.filter(
        (candidate) => candidate.modelQuality === modelQualityOverride,
      )
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
