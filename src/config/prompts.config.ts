/**
 * Prompts configuration
 */
export const promptsConfig = {
  REQUIREMENTS_PROMPTS_FOLDERPATH: "./input/requirements",
  REQS_FILE_REGEX: /requirement\d+\.prompt$/i,
  SAMPLE_PROMPT_FILEPATH: "./input/sample.prompt",
  QUESTIONS_PROMPTS_FILEPATH: "./input/questions.prompts",
  CODEBASE_QUERY_PROMPT: "summarize-codebase-query.prompt",
  PROMPTS_FOLDER_NAME: "prompts",
  FILE_SUMMARY_PROMPTS: {
    java: "java-file-summary.prompt",
    js: "js-file-summary.prompt",
    ts: "js-file-summary.prompt",
    xml: "xml-file-summary.prompt",
    jsp: "jsp-file-summary.prompt",
    md: "markdown-file-summary.prompt",
    pls: "ddl-file-summary.prompt",
    trg: "ddl-file-summary.prompt",
    sql: "ddl-file-summary.prompt",
    ddl: "ddl-file-summary.prompt",
    spd: "ddl-file-summary.prompt",
    _: "default-file-summary.prompt",
  } as const,
  MARKDOWN_FILE_SUMMARY_PROMPTS: "markdown-file-summary.prompt",
  DEFAULT_FILE_SUMMARY_PROMPTS: "default-file-summary.prompt",
  PROMPT_CONTENT_BLOCK_LABEL: "CONTENT_BLOCK",
  PROMPT_QUESTION_BLOCK_LABEL: "QUESTION_BLOCK",
  CODE_BLOCK_MARKDOWN: "```",
} as const;

export default promptsConfig; 