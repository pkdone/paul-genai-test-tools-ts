// Define the object of constants
const baseAppConst = {
  DEFAULT_VECTOR_DIMENSIONS_AMOUNT: 1536,
  DEFAULT_VECTOR_SIMILARITY_TYPE: "euclidean",  // euclidean | cosine | dotProduct
  DEFAULT_VECTOR_QUANTIZATION_TYPE: "scalar",   // scalar | binary
  OUTPUT_DIR: "output",
  OUTPUT_SUMMARY_FILE: "report.txt",
  CODEBASE_DB_NAME: "codebase-analyzed",
  SOURCES_COLLCTN_NAME: "sources",
  SUMMARIES_COLLCTN_NAME: "appsummaries",
  SAMPLE_PROMPT_FILEPATH: "./test/sample.prompt",
  FOLDER_IGNORE_LIST: [
    ".git", 
    "bin", 
    "build", 
    "node_modules", 
    ".vscode", 
    "dist", 
    "output"
  ] as const,
  FILENAME_PREFIX_IGNORE: "test-",
  MAX_CONCURRENCY: 50,
  BINARY_FILE_SUFFIX_IGNORE_LIST: [
    "aac", "abw", "arc", "avif", "avi", "azw", "bin", "bmp", "bz",
    "bz2", "cda", "doc", "docx", "eot", "epub", "gz", "gif", "ico",
    "ics", "jar", "jpeg", "jpg", "mid", "midi", "mp3", "mp4", "mpeg",
    "mpkg", "odp", "ods", "odt", "oga", "ogv", "ogx", "opus", "otf",
    "png", "pdf", "ppt", "pptx", "rar", "rtf", "svg", "tar", "tif",
    "tiff", "ttf", "vsd", "wav", "weba", "webm", "webp", "woff",
    "woff2", "xls", "xlsx", "xul", "zip", "3gp", "3g2", "7z", "ear",
    "war", "tar", "gz", "tgz"
  ] as const,
  SOURCE_FILES_FOR_CODE: ["js", "ts", "java", "py"] as const,
  PROMPTS_FOLDER_NAME: "prompts",
  SRC_FOLDER_NAME: "/src/",
  DIST_FOLDER_NAME: "/dist/",
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
  APP_DESCRIPTION_KEY: "appdescription",
  APP_SUMMARY_ARRAY_FIELDS_TO_GENERATE_KEYS: [
    "technologies",
    "boundedcontexts",
    "busentities",
    "busprocesses"
  ] as const,
  CATEGORY_TITLES: {
    appdescription: "Application Description",
    technologies: "Technology Stack",
    boundedcontexts: "Bounded Contexts",
    busentities: "Business Entities",
    busprocesses: "Business Processes",
  } as const,
} as const;

// Freeze it so it can’t be mutated at runtime and then export it
const appConst = Object.freeze(baseAppConst);
export default appConst;
