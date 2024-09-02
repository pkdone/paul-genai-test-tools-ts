# Paul's GenAI Test Tools (Typescript)

A personal playground for experiencing LLMs and GenAI, in general - may not be useful to others. 

Current test tools:

* Test a MongoDB Connection (`src/test-mdb-connection.ts`)
* Test various LLM providers models - embeddings models + completions small/large models (`src/test-pluggable-llm.ts`)
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
    -  __Text completions model with small token limit__ for generating text and JSON content for dealing with small inputs 
    -  __Text completions model with large token limit__ for generating text and JSON content for dealing with large inputs 

1. From the root folder of this project, run the following command to copy an example environment configuration file to a new file into the same root folder called `.env`, and then edit the values for the properties shown in this new `.env` file to reflect your specific environment settings:

    ```console
    cp 'EXAMPLE.env' '.env'
    ```

1. OPTIONAL: Ensure you have a running MongoDB [Atlas](https://www.mongodb.com/atlas) dedicated cluster of any size/tier. You can even use an 'M0' free-tier version, although for some uses cases, the free-tier storage limit of 512MB may be insufficient. Ensure the approprate network and database access rights are configured. Optional because some use cases won't neeed a database). 


## How To Debug/Run

It is easiest to debug using VS Code and by following these steps:

    -  Open the project in VS Code
    -  In the _Explorer_ select the "src/test-*.ts" file you want to run
    -  From the _Activity Bar_ (left panel), select the _Run and Debug_ view
    -  Execute the pre-configured task _Run and Debug TypeScript_ - this will run the Typescript compiler first, and then, if successful, it will run the program in debug mode, showing its output in the _Debug Console_ of the _Status Bar_ (bottom panel). 

You can also run the "test" TypeScript files from the terminal using the `node` command.


## Running The Project's Unit Tests

Execute the 'test' command from the project's root folder.

  ```console
  npm test
  ```
