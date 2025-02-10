/**
 * Set of app-specific constants
 */
const appConst = {
  OUTPUT_DIR: "output",
  OUTPUT_SUMMARY_FILE: "report.txt",
  CODEBASE_DB_NAME: "codebase-analyzed",
  SRC_COLLCTN_NAME: "sources",
  SAMPLE_PROMPT_FILEPATH: "./test/sample.prompt",
  FOLDER_IGNORE_LIST: [".git", "bin", "build", "node_modules", ".vscode", "dist", "output"] as string[],
  FILENAME_PREFIX_IGNORE: "test-",
  MAX_CONCURRENCY: 50,
  BINARY_FILE_SUFFIX_IGNORE_LIST: ["aac", "abw", "arc", "avif", "avi", "azw", "bin", "bmp", "bz",
    "bz2", "cda", "doc", "docx", "eot", "epub", "gz", "gif", "ico", "ics", "jar", "jpeg", "jpg",
    "mid", "midi", "mp3", "mp4", "mpeg", "mpkg", "odp", "ods", "odt", "oga", "ogv", "ogx", "opus",
    "otf", "png", "pdf", "ppt", "pptx", "rar", "rtf", "svg", "tar", "tif", "tiff", "ttf", "vsd",
    "wav", "weba", "webm", "webp", "woff", "woff2", "xls", "xlsx", "xul", "zip", "3gp", "3g2",
    "7z", "ear", "war", "tar", "gz", "tgz"] as string[],  
} as const;

export default appConst;