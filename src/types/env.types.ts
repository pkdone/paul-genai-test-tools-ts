import { z } from "zod";

/**
 * Base schema for common environment variables
 */
export const baseEnvVarsSchema = z.object({
  MONGODB_URL: z.string().url(),
  CODEBASE_DIR_PATH: z.string().min(1, "CODEBASE_DIR_PATH cannot be empty"),
  IGNORE_ALREADY_PROCESSED_FILES: z
    .union([
      z.enum(["true", "false"]), // Handle strings "true"/"false" (with quotes in .env)
      z.boolean(),               // Handle native boolean true/false (without quotes in .env)
      z.literal("TRUE").transform(() => "true"),      // Handle case variations
      z.literal("FALSE").transform(() => "false"),    // Handle case variations
    ])
    .optional()
    .default("false")
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val === "true";
    }),
  LLM: z.string().min(1, "LLM provider selection cannot be empty"),
});

export type BaseEnvVars = z.infer<typeof baseEnvVarsSchema>;

// This type represents the fully parsed environment variables, including provider-specific ones.
// The actual shape depends on the dynamically constructed schema in bootstrap.ts.
export type EnvVars = BaseEnvVars & Record<string, unknown>; // Allows for provider-specific properties after Zod parsing
