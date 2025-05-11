import dotenv from "dotenv";
import { envVarsSchema, EnvVars } from "../types/env-types";

/**
 * Utility function to load environment variables and validate them.
 */
export function loadEnvVars(): EnvVars {
  dotenv.config();
  return envVarsSchema.parse(process.env);
}
