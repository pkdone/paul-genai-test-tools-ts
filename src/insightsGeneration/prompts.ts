import { fillPrompt } from 'type-safe-prompt';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import * as schemas from './schemas';

// Helper to convert a Zod schema to a JSON string for the prompt
const schemaToJsonString = (schema: z.ZodType): string => {
  return JSON.stringify(zodToJsonSchema(schema), null, 2);
};

// Base instructions for all prompts
const baseInstructions = `
In the JSON response, do not include any explanations - only provide an RFC8259 compliant JSON response following the provided format without deviation.
`;

// App description prompt template
const appDescriptionTemplate = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on that list, return a JSON response that contains the detailed description outlining the application's purpose and implementation. You must write at most 25 sentences for this description.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${baseInstructions}

SOURCES:
{{codeContent}}`;

// Bounded contexts prompt template
const boundedContextsTemplate = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains a concise list of the bounded contexts that exist in the application from a Domain Driven Design perspective, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a bounded context often doesn't map to a single source file's code and is usually an aggregate across multiple sources.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${baseInstructions}

SOURCES:
{{codeContent}}`;

// Business entities prompt template
const businessEntitiesTemplate = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains a concise list of the application's main business entities from a Domain Driven Design perspective, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a business entity often doesn't map to a single source file's code and is usually an aggregate across multiple sources.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${baseInstructions}

SOURCES:
{{codeContent}}`;

// Business processes prompt template
const businessProcessesTemplate = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains a concise list of the application's main business processes, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note a business process often doesn't map to a single source file's code and is usually an aggregate across multiple sources.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${baseInstructions}

SOURCES:
{{codeContent}}`;

// Technologies prompt template
const technologiesTemplate = `Act as a programmer analyzing the code in a legacy application. Take the list of paths and descriptions of its source files shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains a concise list of the key external and host platform technologies depended on by the application, each with a name plus and a description. You MUST write at most 3 sentences for each description. Note the key technologies you catalog should include the programming languages, databases, runtimes, containers, and 3rd party systems (eg, queuing systems, email services, etc).

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

${baseInstructions}

SOURCES:
{{codeContent}}`;

// Exported prompt functions
export const createAppDescriptionPrompt = (codeContent: string): string => {
  return fillPrompt(appDescriptionTemplate, {
    jsonSchema: schemaToJsonString(schemas.appDescriptionSchema),
    codeContent,
  });
};

export const createBoundedContextsPrompt = (codeContent: string): string => {
  return fillPrompt(boundedContextsTemplate, {
    jsonSchema: schemaToJsonString(schemas.boundedContextsSchema),
    codeContent,
  });
};

export const createBusinessEntitiesPrompt = (codeContent: string): string => {
  return fillPrompt(businessEntitiesTemplate, {
    jsonSchema: schemaToJsonString(schemas.businessEntitiesSchema),
    codeContent,
  });
};

export const createBusinessProcessesPrompt = (codeContent: string): string => {
  return fillPrompt(businessProcessesTemplate, {
    jsonSchema: schemaToJsonString(schemas.businessProcessesSchema),
    codeContent,
  });
};

export const createTechnologiesPrompt = (codeContent: string): string => {
  return fillPrompt(technologiesTemplate, {
    jsonSchema: schemaToJsonString(schemas.technologiesSchema),
    codeContent,
  });
}; 