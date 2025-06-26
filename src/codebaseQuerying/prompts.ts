import { fillPrompt } from "type-safe-prompt";

/**
 * Creates a prompt for querying the codebase with a specific question.
 * This prompt instructs the LLM to act as a programmer and answer questions about provided code.
 */
export function createCodebaseQueryPrompt(question: string, codeContent: string): string {
  return fillPrompt(
    `Act as a programmer. I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{codeContent}}`,
    {
      question,
      codeContent,
    }
  );
} 