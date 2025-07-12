import { z } from "zod";
import { zodToJsonSchema, ignoreOverride } from "zod-to-json-schema";
import type { JsonSchema7Type } from "zod-to-json-schema";
import { ObjectId, Decimal128 } from "bson";

export const zBsonObjectId = z.custom<ObjectId>().describe("bson:objectId");
export const zBsonDecimal128 = z.custom<Decimal128>().describe("bson:decimal128");
export const zBsonDate = z.coerce.date();

// Define interfaces for the schema overrides
interface SchemaDefinition {
  description?: string;
  typeName?: z.ZodFirstPartyTypeKind;
}

// Use the appropriate type based on the zod-to-json-schema library requirements
const mongoSchemaOptions = {
  target: "jsonSchema7" as const,
  $refStrategy: "none" as const,
  override: (def: SchemaDefinition): JsonSchema7Type | typeof ignoreOverride => {
    if (def.description === "bson:objectId") return { bsonType: "objectId" } as JsonSchema7Type;
    if (def.description === "bson:decimal128") return { bsonType: "decimal" } as JsonSchema7Type;
    if (def.typeName === z.ZodFirstPartyTypeKind.ZodDate)
      return { bsonType: "date" } as JsonSchema7Type;
    return ignoreOverride;
  },
};

export function generateMDBJSONSchema(schema: z.ZodObject<z.ZodRawShape>) {
  // Generate the JSON schema
  const jsonSchema = zodToJsonSchema(schema, mongoSchemaOptions);

  // Remove the $schema property which MongoDB doesn't support
  const { $schema, ...mdbSchema } = jsonSchema;
  void $schema; // Avoid linting error
  return mdbSchema;
}
