# Paul's GenAI Test Tools (using TypeScript)

A personal playground for experiencing LLMs and GenAI, in general - may not be useful to others. 

Current test tools:

* Test a MongoDB Connection (`src/test-mdb-connection.ts`)
* Test various LLM providers models - embeddings models + completions primary/secondary models (`src/test-pluggable-llm.ts`)
* Test an LLM under load, analyzing files in a codebase concurrently (`src/test-treewalk-llm.ts`)
* Test giving all the source files in one go in a prompt, with a question, to an LLM that has a large token size limit (`src/test-merge-all-files-llm.ts`)


## Prerequisites

1. Ensure you have the following software installed on your workstation:

    - [Node.js JavaScript runtime](https://nodejs.dev/en/download/package-manager/)
    - [`npm` package manager CLI](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
    - [TypeScript npm package](https://www.npmjs.com/package/typescript)
  
1. Install the project's required Node/NPM packages. 

    ```console
    npm install
    ```

1. Ensure you have can leverage LLMs from OpenAI/Azure GPT, GCP Vertex AI or AWS Bedrock API, with the following three models types available to use, along with appropriate API keys / credentials:

    -  __Embeddings model__ for generating vector embeddings 
    -  __Text completions 'primate'model, typically with a small token limit__ for generating text and JSON content for dealing with text inputs 
    -  __Text completions 'secondary' model, typically with a large token limit__ for generating text and JSON content for dealing with text inputs (as backup if primary model errors for a particular piece of cotnent)

1. From the root folder of this project, run the following command to copy an example environment configuration file to a new file into the same root folder called `.env`:

    ```console
    cp 'EXAMPLE.env' '.env'
    ```

    Edit the `.env` file to:
    - Set your `LLM` provider (e.g., "OpenAI", "VertexAIGemini", etc.)
    - Set your MongoDB URL and codebase directory path
    - Add the specific environment variables required for your chosen LLM provider
    
    The system uses a **manifest-driven approach** - you only need to configure environment variables for your selected LLM provider. The application will automatically validate only the variables required for your chosen provider and provide clear error messages if any are missing.

1. OPTIONAL: Ensure you have a running MongoDB [Atlas](https://www.mongodb.com/atlas) dedicated cluster of any size/tier. You can even use an 'M0' free-tier version, although for some uses cases, the free-tier storage limit of 512MB may be insufficient. Ensure the approprate network and database access rights are configured. Optional because some use cases won't neeed a database. 


## How To Debug/Run

It is easiest to debug using VS Code and by following these steps:

1. Open the project in VS Code
1. In the _Explorer_ select the "src/test-*.ts" file you want to run
1. From the _Activity Bar_ (left panel), select the _Run and Debug_ view
1. Execute the pre-configured task _Run and Debug TypeScript_
    - this will run the TypeScript compiler first, and then, if successful, it will run the program in debug mode, showing its output in the _Debug Console_ of the _Status Bar_ (bottom panel). 

You can also run the `node dist/test*.js` JavaScript files (first compiled from TypeScript using the `tsc` command) from the terminal using the `node` command.


## Running The Project's Unit Tests

Execute the 'test' command from the project's root folder.

  ```console
  npm test
  ```


## Application to LLM Authentication Notes

In all cases, first ensure you have enabled the required model for the requried cloud region using the cloud provider's LLM configuration tool.

### OpenAI / Azure GPT

Specify your API key for your own OpenAI or Azure GPT service in `.env`.


### GCP Vertex AI

```console
gcloud auth login
gcloud auth application-default login
```

### AWS Bedrock

Use MDB MANA to access AWS accounts to obtain the SSO start URL, then using the AWS CLI run:

```console
aws configure sso
```

Then edit the file `~/.aws/config` and rename the line `[profile ...]` for the newly generated profile section to `[default]` instead, then run:

``` console
aws sso login
aws sts get-caller-identity        # to test the CLI works
```

For later Bedrock hosted models, need to use the ARN of an inference profile for the particlar region for the model id. To see the region ARNs for models in Bedrock, run:

```console
aws bedrock list-inference-profiles
```

From this output, use the URL defined for the `inferenceProfileArn` parameter.

In the AWS Console, select the Bedrock Configuration | Model Access option and enable access for the models requried.


## Process for Adding LLM Providers

1. **Create Provider Implementation & Manifest**:
   - Create a new directory for your provider group if it doesn't exist: `src/llm/providers/<group_name>/`
   - Inside the group directory, create a directory for your specific provider: `src/llm/providers/<group_name>/<provider_name>/`
   - Create the provider's core logic file: `<provider_name>-llm.ts`. This class should extend `AbstractLLM` or implement `LLMProviderImpl`.
   - Create the provider's manifest file: `<provider_name>.manifest.ts`. This file exports a constant (conventionally named `<providerName>ProviderManifest`) of type `LLMProviderManifest`.
     - **`providerName`**: A user-friendly name (e.g., "My Custom LLM").
     - **`modelFamily`**: A unique string identifier for this provider family (e.g., "MyCustomLLM"). This value will be used in the `.env` file for the `LLM` variable.
     - **`envSchema`**: A `z.object({})` Zod schema defining any environment variables specific to this provider. These variables will be automatically validated if the provider is selected. Example:
       ```typescript
       envSchema: z.object({
         MY_PROVIDER_API_KEY: z.string().min(1),
         MY_PROVIDER_ENDPOINT: z.string().url().optional(),
       }),
       ```
       If your provider doesn't require specific environment variables (e.g., it uses a default SDK credential chain), use `envSchema: z.object({})`.
     - **`models`**: An object defining the `embeddings`, `primaryCompletion`, and optionally `secondaryCompletion` models, including their `modelKey`, `urn`, `purpose`, and token/dimension details.
     - **`errorPatterns`**: An array of `LLMErrorMsgRegExPattern` for parsing token limits from error messages.
     - **`factory`**: A function that takes `(envConfig: EnvVars, modelsKeysSet: LLMModelKeysSet, modelsMetadata: Record<string, LLMModelMetadata>, errorPatterns: readonly LLMErrorMsgRegExPattern[])` and returns an instance of your `<provider_name>-llm.ts` class. Access your specific environment variables from `envConfig` (e.g., `envConfig.MY_PROVIDER_API_KEY as string`).

2. **Update Environment Configuration**:
   - Add any new environment variables (defined in your manifest's `envSchema`) to your local `.env` file with their actual values.
   - Update the comment for the `LLM` variable in both `.env` and `EXAMPLE.env` to include your new `modelFamily` string as an option.
   - Optionally, add documentation for your provider-specific variables to the `EXAMPLE.env` comments section to help other users.

The `llm-service.ts` will automatically discover and register your new provider based on its manifest file. The system uses a **manifest-driven approach** where environment variables are dynamically validated based on the selected provider - no changes are needed in `src/types/env-types.ts` or `src/llm/llm-service.ts` for adding new providers with their own environment variables.
