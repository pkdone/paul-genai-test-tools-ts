import * as schemas from "./ingestion.schemas";
import {
  createPromptFromConfig,
  PromptConfig,
} from "../../llm/utils/prompting/prompt-templator";
import { promptConfig } from "../../llm/utils/prompting/prompt-templator";

// Base template for detailed file summary prompts (Java, JS, etc.)
const SOURCES_SUMMARY_CAPTURE_TEMPLATE = `Act as a programmer. Take the {{fileContentDesc}} shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

{{specificInstructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${promptConfig.FORCE_JSON_RESPONSE_TEXT}

CODE:
{{codeContent}}`;

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const sourceSummaryCapturePromptTemplates: Record<string, PromptConfig> = {
  java: {
    fileContentDesc: "Java code",
    instructions: `* The name of the main public class/interface of the file
 * Its type ('class' or 'interface')
 * Its classpath
 * A very detailed definition of its purpose
 * A very detailed definition of its implementation
 * A list of the internal references to classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)
 * A list of the external references to third-party classes used by this source file, which do not belong to this same application that this class/interface file is part of
 * A list of public constants (name, value and type) it defines (if any)
 * A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation
 * The type of database integration it employs (if any), stating the mechanism used and a description of the integration - if any of the following elements are true in the code, you MUST assume that there is database interaction (if you know the table names the code interacts with, include these table names in the description):
    - Code uses a JDBC driver or JDBC API (set mechanism: 'JDBC')
    - Code contains SQL code (set mechanism: 'SQL')
    - Code uses a database driver or library (set mechanism: 'DRIVER')
    - Code uses a database Object-Relational-Mapper (ORM) like JPA, TopLink, Hibernate, etc, (set mechanism: 'ORM')
    - Code uses a Spring Data API (set mechanism: 'SPRING-DATA')
    - Code has a Java class integrating with a database by an Enterprise Java Bean (EJB), which also could be CMP or BMP based (set mechanism: 'EJB')
    - Code uses a 3rd party framework/library for database access (set mechanism: 'OTHER')
    - Otherwise, if the code does not use a database, then set mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a dataase)`,
    schema: schemas.javaFileSummarySchema,
  },
  js: {
    fileContentDesc: "JavaScript/TypeScript code",
    instructions: `* A very detailed definition of its purpose
 * A very detailed definition of its implementation
 * A list of the internal references to other modules used by this source file (by using \`require\` or \`import\` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)
 * A list of the external references to other external modules/libraries used by this source file (by using \`require\` or \`import\` keywords), which do not belong to this same application that this source file is part of
 * The type of direct database integration via a driver/library/API it employs, if any (stating the mechanism used in capitals, or NONE if no code does not interact with a database directly) and a description of the database integration.`,
    schema: schemas.jsFileSummarySchema,
  },
  default: {
    fileContentDesc: "project file content",
    instructions: `* A detailed definition of its purpose
* A detailed definition of its implementation 
* The type of direct database integration via a driver/library/API it employs, if any (stating the mechanism used in capitals, or NONE if no code does not interact with a database directly) and a description of the database integration.`,
    schema: schemas.defaultFileSummarySchema,
  },
  ddl: {
    fileContentDesc: "database DDL/SQL code",
    instructions: `* A detailed definition of its purpose
 * A detailed definition of its implementation
 * A list of the tables (if any) it defines - for each table, include the table's name and a copy of the command that creates the file used to create the table
 * A list of the stored procedure (if any) it defines - for each stored procedure, include the stored procedure's name, its purpose in detail, the number of lines of code in the stored procedure, and a complexity score or how complex the stored procedure's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a reason for the chosen complexity score.
 * A list of the triggers (if any) it defines - for each trigger, include the trigger's name, its purpose in detail, the number of lines of code in the trigger, and a complexity score or how complex the trigger's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a reason for the chosen complexity score.
 * The most prominent type of database integration it employs (if any), stating the mechanism used ('NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER') and a description of the integration 
 * The type of database integration it employs (if any), stating the mechanism used and a description of the integration`,
    schema: schemas.ddlFileSummarySchema,
  },
  xml: {
    fileContentDesc: "XML code",
    instructions: `* Details about its purpose
* Details about its implementation
* The type of database integration it employs (if any), stating the mechanism used and a description of the integration`,
    schema: schemas.xmlFileSummarySchema,
  },
  jsp: {
    fileContentDesc: "JSP code",
    instructions: `* Details about its purpose
* Details about its implementation
* A list of the internal references to classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)
 * A list of the external references to third-party classes used by this source file, which do not belong to this same application that this class/interface file is part of    
* A list of detailed descriptions of the data input fields it contains (if any)`,
    schema: schemas.jspFileSummarySchema,
  },
  markdown: {
    fileContentDesc: "Markdown content",
    instructions: `* Details about its purpose
* Details about its implementation
* The type of database integration the markdown content implies that the application uses (if any), stating the mechanism used and a description of the integration`,
    schema: schemas.markdownFileSummarySchema,
  },
} as const;

/**
 * Type for valid prompt template keys
 */
export type SummaryPromptType = keyof typeof sourceSummaryCapturePromptTemplates;

/**
 * Generic function to create any summary prompt using the data-driven approach
 */
export const createSummaryPrompt = (type: SummaryPromptType, codeContent: string): string => {
  const config = sourceSummaryCapturePromptTemplates[type];
  return createPromptFromConfig(
    SOURCES_SUMMARY_CAPTURE_TEMPLATE,
    config,
    codeContent,
  );
};
