import { z } from "zod";
import { sourceFileSummarySchema } from "../../schemas/source-summary.schema";
import { databaseIntegrationSchema, methodParameterSchema } from "../../schemas/common.schemas";

// Schema for `java-file-summary.prompt`
export const javaFileSummarySchema = sourceFileSummarySchema
  .pick({
    classname: true,
    type: true,
    classpath: true,
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    publicConstants: true,
    publicMethods: true,
    databaseIntegration: true,
  })
  .extend({
    // Add descriptions for LLM prompts
    classname: z.string().describe("The name of the main public class or interface."),
    type: z.enum(["class", "interface"]).describe("The type of the main entity."),
    classpath: z.string().describe("The fully qualified classpath."),
    purpose: z
      .string()
      .describe("A detailed definition of the file's purpose (at least 6 sentences)."),
    implementation: z
      .string()
      .describe("A detailed definition of its implementation (at least 6 sentences)."),
    internalReferences: z.array(z.string()).describe("A list of internal classpaths referenced."),
    externalReferences: z
      .array(z.string())
      .describe("A list of third-party classpaths referenced."),
    publicConstants: z
      .array(
        z.object({
          name: z.string(),
          value: z.string(),
          type: z.string(),
        }),
      )
      .describe("A list of public constants defined."),
    publicMethods: z
      .array(
        z.object({
          name: z.string(),
          purpose: z.string().describe("Detailed purpose of the method (at least 6 sentences)."),
          parameters: z.array(methodParameterSchema).optional(),
          returnType: z.string(),
          description: z.string().describe("Detailed description of the method's implementation."),
        }),
      )
      .describe("A list of public methods."),
    databaseIntegration: databaseIntegrationSchema
      .extend({
        mechanism: z
          .string()
          .describe("The database integration mechanism used, e.g., 'JDBC', 'ORM', 'NONE'."),
        description: z.string().describe("A detailed description of the database integration."),
      })
      .describe("Information about how the file interacts with a database."),
  });
export type JavaFileSummary = z.infer<typeof javaFileSummarySchema>;

// Schema for `js-file-summary.prompt`
export const jsFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    databaseIntegration: true,
  })
  .extend({
    purpose: z.string().describe("A detailed definition of its purpose (at least 6 sentences)."),
    implementation: z
      .string()
      .describe("A detailed definition of its implementation (at least 6 sentences)."),
    internalReferences: z.array(z.string()).describe("A list of internal modules referenced."),
    externalReferences: z.array(z.string()).describe("A list of external modules referenced."),
    databaseIntegration: databaseIntegrationSchema
      .extend({
        mechanism: z
          .string()
          .describe("The database integration mechanism used, e.g., 'JDBC', 'ORM', 'NONE'."),
        description: z.string().describe("A detailed description of the database integration."),
      })
      .describe("Information about how the file interacts with a database."),
  });
export type JsFileSummary = z.infer<typeof jsFileSummarySchema>;

// Schema for `default-file-summary.prompt`
export const defaultFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
  })
  .extend({
    purpose: z.string().describe("A detailed definition of its purpose (at least 4 sentences)."),
    implementation: z
      .string()
      .describe("A detailed definition of its implementation (at least 3 sentences)."),
    databaseIntegration: databaseIntegrationSchema
      .extend({
        mechanism: z
          .string()
          .describe("The database integration mechanism used, e.g., 'JDBC', 'ORM', 'NONE'."),
        description: z.string().describe("A detailed description of the database integration."),
      })
      .describe("Information about how the file interacts with a database."),
  });
export type DefaultFileSummary = z.infer<typeof defaultFileSummarySchema>;

// Schema for `ddl-file-summary.prompt`
export const ddlFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    tables: true,
    storedProcedures: true,
    triggers: true,
  })
  .extend({
    purpose: z.string().describe("A detailed definition of its purpose (at least 2 sentences)."),
    implementation: z
      .string()
      .describe("A detailed definition of its implementation (at least 2 sentences)."),
    tables: z
      .array(
        z.object({
          name: z.string(),
          command: z.string(),
        }),
      )
      .describe("A list of tables defined."),
    storedProcedures: z
      .array(
        z.object({
          name: z.string(),
          purpose: z
            .string()
            .describe("Detailed purpose of the stored procedure (at least 4 sentences)."),
          linesOfCode: z.number(),
          complexity: z.enum(["LOW", "MEDIUM", "HIGH"]),
        }),
      )
      .describe("A list of stored procedures defined."),
    triggers: z
      .array(
        z.object({
          name: z.string(),
          purpose: z.string().describe("Detailed purpose of the trigger (at least 4 sentences)."),
          linesOfCode: z.number(),
          complexity: z.enum(["LOW", "MEDIUM", "HIGH"]),
        }),
      )
      .describe("A list of triggers defined."),
    databaseIntegration: z.object({
      mechanism: z.enum(["NONE", "DDL", "DML", "SQL", "STORED-PROCEDURE", "TRIGGER"]),
      description: z
        .string()
        .describe("A detailed description of the database integration (at least 2 sentences)."),
    }),
  });
export type DdlFileSummary = z.infer<typeof ddlFileSummarySchema>;

// Schema for `xml-file-summary.prompt`
export const xmlFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
  })
  .extend({
    purpose: z.string().describe("A detailed definition of its purpose."),
    implementation: z.string().describe("A detailed definition of its implementation."),
    databaseIntegration: databaseIntegrationSchema
      .extend({
        mechanism: z
          .string()
          .describe("The database integration mechanism used, e.g., 'JDBC', 'ORM', 'NONE'."),
        description: z.string().describe("A detailed description of the database integration."),
      })
      .describe("Information about how the file interacts with a database."),
  });
export type XmlFileSummary = z.infer<typeof xmlFileSummarySchema>;

// Schema for `jsp-file-summary.prompt`
export const jspFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    databaseIntegration: true,
  })
  .extend({
    purpose: z.string().describe("A detailed definition of its purpose."),
    implementation: z.string().describe("A detailed definition of its implementation."),
    internalReferences: z.array(z.string()).describe("A list of internal references."),
    externalReferences: z.array(z.string()).describe("A list of external references."),
    databaseIntegration: databaseIntegrationSchema
      .extend({
        mechanism: z
          .string()
          .describe("The database integration mechanism used, e.g., 'JDBC', 'ORM', 'NONE'."),
        description: z.string().describe("A detailed description of the database integration."),
      })
      .describe("Information about how the file interacts with a database."),
  });
export type JspFileSummary = z.infer<typeof jspFileSummarySchema>;

// Schema for `markdown-file-summary.prompt`
export const markdownFileSummarySchema = sourceFileSummarySchema
  .pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
  })
  .extend({
    purpose: z.string().describe("A detailed definition of its purpose."),
    implementation: z.string().describe("A detailed definition of its implementation."),
    databaseIntegration: databaseIntegrationSchema
      .extend({
        mechanism: z
          .string()
          .describe("The database integration mechanism used, e.g., 'JDBC', 'ORM', 'NONE'."),
        description: z.string().describe("A detailed description of the database integration."),
      })
      .describe("Information about how the file interacts with a database."),
  });
export type MarkdownFileSummary = z.infer<typeof markdownFileSummarySchema>;
