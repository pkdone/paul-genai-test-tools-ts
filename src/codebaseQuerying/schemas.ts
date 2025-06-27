import { z } from "zod";

/**
 * Schema for codebase query response - just a simple string answer
 */
export const codebaseQueryResponseSchema = z.string().min(1);

/**
 * Type for codebase query response
 */
export type CodebaseQueryResponse = z.infer<typeof codebaseQueryResponseSchema>; 