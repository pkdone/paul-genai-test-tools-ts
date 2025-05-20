import path from "path";
import appConst from "../env/app-consts";

/**
 * Get the name of a project from its path.
 */
export function getProjectNameFromPath(filePath: string) { 
  const normalisedPath = filePath.endsWith("/") ? filePath.slice(0, -1) : filePath;  
  return path.basename(normalisedPath);   
}

/**
 * Returns the suffix of a filename from a full file path.
 */
export function getFileSuffix(filepath: string) {
  const baseName = path.basename(filepath);
  let suffix = "";

  if (baseName.includes(".")) {
    suffix = baseName.split(".").pop() ?? "";
  }

  return suffix;
}  

/**
 * For the text content of a file as a template string and replaces a specific variables with
 */
export function transformJSToTSFilePath(jsSrcPath: string, localFolderName: string, localFileName: string) {
  const filepath = path.join(jsSrcPath, localFolderName, localFileName);
  return filepath.replace(appConst.DIST_FOLDER_NAME, appConst.SRC_FOLDER_NAME);
}  
