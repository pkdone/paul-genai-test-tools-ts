/**
 * File system configuration
 */
export const fileSystemConfig = {
  OUTPUT_DIR: "output",
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
  SOURCE_FILES_FOR_CODE: ["js", "ts", "java", "py", "sql"] as const,
  JAVA_FILE_TYPE: "java",
  SRC_FOLDER_NAME: "/src/",
  DIST_FOLDER_NAME: "/dist/",
  MANIFEST_FILE_SUFFIX: ".manifest.js",
  PROVIDER_MANIFEST_KEY: "ProviderManifest",
  PROVIDERS_FOLDER_NAME: "providers",
  TRAILING_SLASH_PATTERN: /\/$/,  //Regex pattern to match trailing slash at end of string
} as const; 