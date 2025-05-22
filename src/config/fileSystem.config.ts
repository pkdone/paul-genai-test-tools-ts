// File system configuration
export const fileSystemConfig = {
  OUTPUT_DIR: "output",
  OUTPUT_SUMMARY_FILE: "report.txt",
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
  SOURCE_FILES_FOR_CODE: ["js", "ts", "java", "py"] as const,
  JAVA_FILE_TYPE: "java",
  SRC_FOLDER_NAME: "/src/",
  DIST_FOLDER_NAME: "/dist/",
} as const;

export default fileSystemConfig; 