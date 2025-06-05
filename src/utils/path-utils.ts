import path from "path";
import fileSystemConfig from "../config/fileSystem.config";

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
 * Transforms a JavaScript build path to its corresponding TypeScript source path.
 * This function converts paths from the dist folder to the src folder based on 
 * configurable constants, ensuring consistency with the project's build structure.
 * 
 * @param jsSrcPath - The base JavaScript path (typically __dirname in compiled code)
 * @param localFolderName - The local folder name within the path
 * @param localFileName - The local file name
 * @returns The transformed path pointing to the source location
 */
export function transformJSToTSFilePath(jsSrcPath: string, localFolderName: string, localFileName: string): string {
  const filepath = path.join(jsSrcPath, localFolderName, localFileName);
  
  // Use configurable constants from file system config instead of hardcoded values
  const { DIST_FOLDER_NAME, SRC_FOLDER_NAME } = fileSystemConfig;
  
  // Normalize the path and perform the transformation
  const normalizedPath = path.normalize(filepath);
  
  // Check if the dist folder pattern exists in the path before attempting replacement
  if (normalizedPath.includes(DIST_FOLDER_NAME)) {
    return normalizedPath.replace(DIST_FOLDER_NAME, SRC_FOLDER_NAME);
  }
  
  // If dist folder is not found, return the original path
  // This handles cases where the function might be called with already-transformed paths
  return normalizedPath;
}  
