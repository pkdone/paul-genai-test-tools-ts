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

1. From the root folder of this project, run the following command to copy an example environment configuration file to a new file into the same root folder called `.env`, and then edit the values for the properties shown in this new `.env` file to reflect your specific environment settings:

    ```console
    cp 'EXAMPLE.env' '.env'
    ```

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
   - Create directory: `src/llm/providers/<group_name>/<provider_name>/`
   - Create implementation: `<provider_name>-llm.ts` 
   - Create manifest: `<provider_name>.manifest.ts` (auto-discovered by LLM service)

2. **Define Environment Variables** (if needed):
   - Modify `src/types/env-types.ts` only if the new provider requires new environment variables
   - Update `.env` and `EXAMPLE.env` with actual and example values
