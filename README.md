# Paul's GenAI Test Tools (Typescript)

A personal playground for experiencing LLMs and GenAI, in general - may not be useful to others. 

Current test tools:

* Test a MongoDB Connection (`src/test-mdb-connection.ts`)
* Test various LLM providers models - embeddings models + completions regular/premium models (`src/test-pluggable-llm.ts`)
* Test an LLM under load, analyzing files in a codebase concurrently (`src/test-treewalk-llm.ts`)
* Test giving all the source files in one go in a prompt, with a question, to an LLM that has a large token size limit (`src/test-merge-all-files-llm.ts`)


## Prerequisites

1. Ensure you have the following software installed on your workstation:

    - [Node.js JavaScript runtime](https://nodejs.dev/en/download/package-manager/)
    - [`npm` package manager CLI](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
    - [Typescript npm package](https://www.npmjs.com/package/typescript)
  
1. Install the project's required Node/NPM packages. 

    ```console
    npm install
    ```

1. Ensure you have can leverage LLMs from OpenAI, Azure OpenAI, GCP Vertex AI or AWS Bedrock API, with the following three models types available to use, along with appropriate API keys / credentials:

    -  __Embeddings model__ for generating vector embeddings 
    -  __Text completions 'regular'model, typically with a small token limit__ for generating text and JSON content for dealing with smaller inputs 
    -  __Text completions 'premium' model, typically with a large token limit__ for generating text and JSON content for dealing with larger inputs 

1. From the root folder of this project, run the following command to copy an example environment configuration file to a new file into the same root folder called `.env`, and then edit the values for the properties shown in this new `.env` file to reflect your specific environment settings:

    ```console
    cp 'EXAMPLE.env' '.env'
    ```

1. OPTIONAL: Ensure you have a running MongoDB [Atlas](https://www.mongodb.com/atlas) dedicated cluster of any size/tier. You can even use an 'M0' free-tier version, although for some uses cases, the free-tier storage limit of 512MB may be insufficient. Ensure the approprate network and database access rights are configured. Optional because some use cases won't neeed a database). 


## How To Debug/Run

It is easiest to debug using VS Code and by following these steps:

1. Open the project in VS Code
1. In the _Explorer_ select the "src/test-*.ts" file you want to run
1. From the _Activity Bar_ (left panel), select the _Run and Debug_ view
1. Execute the pre-configured task _Run and Debug TypeScript_
    - this will run the Typescript compiler first, and then, if successful, it will run the program in debug mode, showing its output in the _Debug Console_ of the _Status Bar_ (bottom panel). 

You can also run the "dist/test*.js" JavaScript files (first compiled from TypeScript using the `tsc` command) from the terminal using the `node` command.


## Running The Project's Unit Tests

Execute the 'test' command from the project's root folder.

  ```console
  npm test
  ```


## Application to LLM Authentication Notes

### OpenAI / Azure

Specify your API key for that service in `.env`.


### GCP Vertex AI

```console
gcloud auth login
gcloud auth application-default login
```

### AWS Bedrock

Use MDB MANA access to AWS accounts to get SSO start URL, then using the AWS CLI run:

```console
aws configure sso
```

Then edit the file `~/.aws/config` and rename the line `[profile ...]` for the newly generated profile section `[default]` instead, then run:

```
aws sso login
aws sts get-caller-identity        # tests cli works
```
