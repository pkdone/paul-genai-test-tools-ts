import * as schemas from './schemas';
import { buildPrompt } from '../utils/prompt-utils';
import { promptConfig } from '../config';
import { z } from 'zod';

// Base template for detailed file summary prompts (Java, JS, etc.)
const DETAILED_SUMMARY_BASE_TEMPLATE = `Act as a programmer. Take the {{fileType}} code shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

{{specificInstructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${promptConfig.FILE_SUMMARY_BASE_INSTRUCTIONS}

CODE:
{{codeContent}}`;

// Base template for simple file summary prompts (default, generic)
const SIMPLE_SUMMARY_BASE_TEMPLATE = `Act as a programmer. {{specificInstructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${promptConfig.FILE_SUMMARY_BASE_INSTRUCTIONS}

CODE:
{{codeContent}}`;

/**
 * Creates a detailed summary prompt by injecting file type and instructions into the base template
 */
function createDetailedSummaryPrompt(fileType: string, instructions: string, schema: z.ZodType, codeContent: string): string {
  const template = DETAILED_SUMMARY_BASE_TEMPLATE
    .replace('{{fileType}}', fileType)
    .replace('{{specificInstructions}}', instructions);
  return buildPrompt(template, schema, codeContent);
}

/**
 * Creates a simple summary prompt by injecting instructions into the base template
 */
function createSimpleSummaryPrompt(instructions: string, schema: z.ZodType, codeContent: string): string {
  const template = SIMPLE_SUMMARY_BASE_TEMPLATE.replace('{{specificInstructions}}', instructions);
  return buildPrompt(template, schema, codeContent);
}

/**
 * Interface for detailed prompt template configuration
 */
interface DetailedPromptTemplate {
  fileType: string;
  instructions: string;
  schema: z.ZodType;
  templateType: 'detailed';
}

/**
 * Interface for simple prompt template configuration
 */
interface SimplePromptTemplate {
  instructions: string;
  schema: z.ZodType;
  templateType: 'simple';
}

/**
 * Union type for prompt template configuration
 */
export type PromptTemplate = DetailedPromptTemplate | SimplePromptTemplate;

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const summaryPromptTemplates = {
  java: { 
    fileType: 'Java',
    templateType: 'detailed' as const,
    instructions: `* The name of the main public class/interface of the file
 * Its type ('class' or 'interface')
 * Its classpath
 * A very detailed definition of its purpose (you must write at least 6 sentences for this)
 * A very detailed definition of its implementation (you must write at least 6 sentences for this)
 * A list of the internal references to classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)
 * A list of the external references to third-party classes used by this source file, which do not belong to this same application that this class/interface file is part of
 * A list of public constants (name, value and type) it defines (if any)
 * A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail (you MUST write at least 6 sentences for this purpose), a list of its parameters, its return type and a very detailed description of its implementation
 * The type of database integration it employs (if any), stating the mechanism used and a description of the integration (you MUST write at least 4 sentences for this description + an example code snippet of the databaase interaction) - if any of the following elements are true in the code, you MUST assume that there is database interaction (if you know the table names the code interacts with, include these table names in the description):
    - Code uses a JDBC driver or JDBC API (set mechanism: 'JDBC')
    - Code contains SQL code (set mechanism: 'SQL')
    - Code uses a database driver or library (set mechanism: 'DRIVER')
    - Code uses a database Object-Relational-Mapper (ORM) like JPA, TopLink, Hibernate, etc, (set mechanism: 'ORM')
    - Code uses a Spring Data API (set mechanism: 'SPRING-DATA')
    - Code has a Java class integrating with a database by an Enterprise Java Bean (EJB), which also could be CMP or BMP based (set mechanism: 'EJB')
    - Code uses a 3rd party framework/library for database access (set mechanism: 'OTHER')
    - Otherwise, if the code does not use a database, then set mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a dataase)`,
    schema: schemas.javaFileSummarySchema 
  },
  js: { 
    fileType: 'JavaScript/TypeScript',
    templateType: 'detailed' as const,
    instructions: `* A very detailed definition of its purpose (you must write at least 6 sentences for this)
 * A very detailed definition of its implementation (you must write at least 6 sentences for this)
 * A list of the internal references to other modules used by this source file (by using \`require\` or \`import\` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)
 * A list of the external references to other external modules/libraries used by this source file (by using \`require\` or \`import\` keywords), which do not belong to this same application that this source file is part of
 * The type of direct database integration via a driver/library/API it employs, if any (stating the mechanism used in capitals, or NONE if no code does not interact with a database directly) and a description of the database integration.`,
    schema: schemas.jsFileSummarySchema 
  },
  default: { 
    templateType: 'simple' as const,
    instructions: 'Take the content of an application source file shown below in the section marked \'CODE\' and for this content, return a JSON response containing data which includes a detailed definition of its purpose (you must write at least 4 sentences for this purpose), a detailed definition of its implementation (you must write at least 3 sentences for this implementation) and the type of direct database integration via a driver/library/API it employs, if any (stating the mechanism used in capitals, or NONE if no code does not interact with a database directly) and a description of the database integration.',
    schema: schemas.defaultFileSummarySchema 
  },
  ddl: { 
    templateType: 'simple' as const,
    instructions: `Take the content from a database DDL/SQL source code shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

 * A detailed definition of its purpose (you must write at least 2 sentences for this)
 * A detailed definition of its implementation (you must write at least 2 sentences for this)
 * A list of the tables (if any) it defines - for each table, include the table's name and a copy of the command that creates the file used to create the table
 * A list of the stored procedure (if any) it defines - for each stored procedure, include the stored procedure's name, its purpose in detail (you MUST write at least 4 sentences for this purpose), the number of lines of code in the stored procedure, and a complexity score or how complex the stored procedure's code is (the score must be have one of the follinwg values: 'LOW', 'MEDIUM', 'HIGH')
 * A list of the triggers (if any) it defines - for each trigger, include the trigger's name, its purpose in detail (you MUST write at least 4 sentences for this purpose), the number of lines of code in the trigger, and a complexity score or how complex the trigger's code is (the score must be have one of the follinwg values: 'LOW', 'MEDIUM', 'HIGH')
 * The most prominent type of database integration it employs (if any), stating the mechanism used ('NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER') and a description of the integration (you MUST write at least 2 sentences for this description)`,
    schema: schemas.ddlFileSummarySchema 
  },
  xml: { 
    templateType: 'simple' as const,
    instructions: 'Analyze the following source code and provide details about its purpose, implementation, and database integration.',
    schema: schemas.xmlFileSummarySchema 
  },
  jsp: { 
    templateType: 'simple' as const,
    instructions: 'Analyze the following source code and provide details about its purpose, implementation, and database integration.',
    schema: schemas.jspFileSummarySchema 
  },
  markdown: { 
    templateType: 'simple' as const,
    instructions: 'Analyze the following source code and provide details about its purpose, implementation, and database integration.',
    schema: schemas.markdownFileSummarySchema 
  },
} as const;

/**
 * Type for valid prompt template keys
 */
export type SummaryPromptType = keyof typeof summaryPromptTemplates;

/**
 * Generic function to create any summary prompt using the data-driven approach
 */
export const createSummaryPrompt = (type: SummaryPromptType, codeContent: string): string => {
  const config = summaryPromptTemplates[type];
  
  if (config.templateType === 'detailed') {
    return createDetailedSummaryPrompt(config.fileType, config.instructions, config.schema, codeContent);
  } else {
    return createSimpleSummaryPrompt(config.instructions, config.schema, codeContent);
  }
};

// Backwards compatibility - exported functions that use the new data-driven approach
export const createJavaSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('java', codeContent);
};

export const createJsSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('js', codeContent);
};

export const createDefaultSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('default', codeContent);
};

export const createDdlSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('ddl', codeContent);
};

export const createXmlSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('xml', codeContent);
};

export const createJspSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('jsp', codeContent);
};

export const createMarkdownSummaryPrompt = (codeContent: string): string => {
  return createSummaryPrompt('markdown', codeContent);
}; 