import { z } from "zod";

/**
 * Schema for database integration information
 * Used across multiple file summary types and database storage
 */
export const databaseIntegrationSchema = z
  .object({
    mechanism: z
      .enum([
        "NONE",
        "JDBC",
        "SPRING-DATA",
        "SQL",
        "HIBERNATE",
        "JPA",
        "MQL",
        "ORM",
        "EJB",
        "OTHER",
      ])
      .describe("The database integration mechanism used."),
    description: z.string().describe("A detailed description of the database integration."),
  })
  .passthrough();

/**
 * Schema for name-description pairs
 * Used in insights generation and app summaries
 */
export const nameDescSchema = z
  .object({
    name: z.string().describe("The name of the entity."),
    description: z.string().describe("A detailed description of the entity."),
  })
  .passthrough();

/**
 * Schema for tables used in DDL files
 */
export const tablesSchema = z
  .object({
    name: z.string().describe("The name of the table."),
    command: z.string().describe("The DDL command for the table."),
  })
  .passthrough();

/**
 * Schema for stored procedures and triggers
 */
export const procedureTriggerSchema = z
  .object({
    name: z.string().describe("The name of the procedure or trigger."),
    purpose: z.string().describe("Detailed purpose (at least 4 sentences)."),
    complexity: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Complexity score."),
    complexityReason: z
      .string()
      .describe("A brief, one-sentence reason for the chosen complexity score."),
    linesOfCode: z.number().describe("Number of lines of code."),
  })
  .passthrough();

/**
 * Schema for public constants
 */
export const publicConstantSchema = z
  .object({
    name: z.string().describe("The name of the constant."),
    value: z.string().describe("The value of the constant."),
    type: z.string().describe("The type of the constant."),
  })
  .passthrough();

/**
 * Provides type safety for method parameter definitions
 */
export const methodParameterSchema = z
  .object({
    name: z.string().describe("The name of the parameter."),
    type: z.string().describe("The type of the parameter."),
  })
  .passthrough();

/**
 * Schema for public methods
 */
export const publicMethodSchema = z
  .object({
    name: z.string().describe("The name of the method."),
    purpose: z.string().describe("Detailed purpose of the method (at least 6 sentences)."),
    parameters: z.array(methodParameterSchema).optional().describe("List of parameters."),
    returnType: z.string().describe("The return type of the method."),
    description: z.string().describe("Detailed description of the method's implementation."),
  })
  .passthrough();
