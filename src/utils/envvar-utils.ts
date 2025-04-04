import { config } from "dotenv";
config();
type EnvVarValue = string | number | boolean | null | undefined | object | Date | bigint | symbol;

/**
 * Retrieves the value of a specified environment variable, converting it to its inferred type,
 * or returns a provided default value if the environment variable is not set.
 * Assumes the default value is already of the proper type.
 *
 * @param envVarName - The name of the environment variable to retrieve.
 * @param defaultValue - An optional default value to return if the environment variable is not set, assumed to be of the correct type.
 * @returns The value of the environment variable in its inferred JavaScript type, or the default value if not set.
 * @throws Throws an error if the environment variable is not set and no default value is provided.
 */
export function getEnvVar<T = unknown>(envVarName: string, defaultValue: T | undefined = undefined) {
  const value = process.env[envVarName];

  if (!value) {
    if (!defaultValue) {
      throw new Error(`Environment variable "${envVarName}" is not set`);
    } else {
      return defaultValue;
    }
  } else {
    return convertToType(value) as T;
  }
}

/**
 * Converts a string value to its inferred JavaScript type.
 * Supports conversion to Number, Boolean, Null, Undefined, Array, Object, Date, BigInt, and Symbol.
 * If the value does not match any specific type pattern, it is returned as a string.
 *
 * @param value - The string value to be converted.
 * @returns The converted value in its appropriate JavaScript type.
 */
export function convertToType(value: string) {
  if (!isNaN(Number(value))) return Number(value);

  try {
    const obj: unknown = JSON.parse(value);
    return extractSpecialTypeFromObj(obj as EnvVarValue);
  } catch {
    switch (value.toLowerCase()) {
      case "true": return true;
      case "false": return false;
      case "undefined": return undefined;
      case "null": return null;
      default: return value;    
    }
  }
}

/**
 * Extracts special types from an object based on the 'type' property.
 * Supported special types are 'bigint', 'symbol', and 'date'.
 * If the object does not have a valid 'type' and 'value' property, the original object is returned.
 * 
 * @param obj - The object from which to extract the special type.
 * @returns The extracted special type if the 'type' and 'value' properties are present, otherwise 
 *          the original object.
 */
export function extractSpecialTypeFromObj(obj: EnvVarValue) {
  if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
    const typedObj = obj as { type?: string, value?: unknown };

    if (typedObj.type && typedObj.value) {
      switch (typedObj.type) {
        case "bigint":
          return BigInt(typedObj.value as bigint);
        case "symbol":
          return Symbol(typedObj.value as (string | number));
        case "date":
          return new Date(typedObj.value as (string | number | Date));
      }
    }
  }
  
  return obj;
}
