import { buildPrompt } from "./prompt-utils";
import { z } from "zod";

/**
 * Base interface for prompt configuration
 */
interface BasePromptConfig {
  schema: z.ZodType;
}

/**
 * Configuration for simple prompts that only need details injection
 */
export interface SimplePromptConfig extends BasePromptConfig {
  details: string;
  templateType: "simple";
}

/**
 * Configuration for detailed prompts that need file type and instructions
 */
export interface DetailedPromptConfig extends BasePromptConfig {
  fileType: string;
  instructions: string;
  templateType: "detailed";
}

/**
 * Configuration for basic prompts that only need instructions
 */
export interface BasicPromptConfig extends BasePromptConfig {
  instructions: string;
  templateType: "basic";
}

/**
 * Union type for all prompt configuration types
 */
export type PromptConfig = SimplePromptConfig | DetailedPromptConfig | BasicPromptConfig;

/**
 * Template processor for simple prompts (insights-style)
 * Replaces {{promptDetails}} with config.details
 */
export function processSimpleTemplate(
  baseTemplate: string,
  config: SimplePromptConfig,
  codeContent: string,
): string {
  const template = baseTemplate.replace("{{promptDetails}}", config.details);
  return buildPrompt(template, config.schema, codeContent);
}

/**
 * Template processor for detailed prompts (ingestion-style detailed)
 * Replaces {{fileType}} and {{specificInstructions}}
 */
export function processDetailedTemplate(
  baseTemplate: string,
  config: DetailedPromptConfig,
  codeContent: string,
): string {
  const template = baseTemplate
    .replace("{{fileType}}", config.fileType)
    .replace("{{specificInstructions}}", config.instructions);
  return buildPrompt(template, config.schema, codeContent);
}

/**
 * Template processor for basic prompts (ingestion-style simple)
 * Replaces {{specificInstructions}} with config.instructions
 */
export function processBasicTemplate(
  baseTemplate: string,
  config: BasicPromptConfig,
  codeContent: string,
): string {
  const template = baseTemplate.replace("{{specificInstructions}}", config.instructions);
  return buildPrompt(template, config.schema, codeContent);
}

/**
 * Template map for different prompt types
 */
export interface TemplateMap {
  simple?: string;
  detailed?: string;
  basic?: string;
}

/**
 * Convenience function for creating prompts with automatic processor selection
 */
export function createPromptFromConfig(
  baseTemplates: TemplateMap,
  config: PromptConfig,
  codeContent: string,
): string {
  switch (config.templateType) {
    case "simple": {
      const template = baseTemplates.simple;
      if (!template) {
        throw new Error("No template found for type: simple");
      }
      return processSimpleTemplate(template, config, codeContent);
    }
    case "detailed": {
      const template = baseTemplates.detailed;
      if (!template) {
        throw new Error("No template found for type: detailed");
      }
      return processDetailedTemplate(template, config, codeContent);
    }
    case "basic": {
      const template = baseTemplates.basic;
      if (!template) {
        throw new Error("No template found for type: basic");
      }
      return processBasicTemplate(template, config, codeContent);
    }
    default:
      throw new Error(
        `Unknown template type: ${String((config as { templateType: string }).templateType)}`,
      );
  }
}
