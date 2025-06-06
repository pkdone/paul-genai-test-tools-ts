import dotenv from "dotenv";
import { z } from "zod";
import { baseEnvVarsSchema } from "../types/env.types";

/**
 * Utility function to load only base environment variables and validate them.
 */
export function loadBaseEnvVarsOnly(): z.infer<typeof baseEnvVarsSchema> {
  dotenv.config();
  const rawEnv = process.env;
  const parsedEnv = baseEnvVarsSchema.parse(rawEnv);
  return parsedEnv;
}


