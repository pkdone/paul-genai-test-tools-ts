import appConst from "../types/app-constants";
import { promises as fs } from "fs";
import path from "path";
import { logErrorMsgAndDetail } from "./error-utils";
const UTF8_ENCODING = "utf8";

//
// Get the name of a project from its path.
//
export function getProjectNameFromPath(filePath: string) { 
  const normalisedPath = filePath.endsWith("/") ? filePath.slice(0, -1) : filePath;  
  return path.basename(normalisedPath);   
}


/**
 * Read content from a file
 */
export async function readFile(filepath: string) {
  return fs.readFile(filepath, UTF8_ENCODING);
}

//
// Write content to a file.
//
export async function writeFile(filepath: string, content: string) {
  await fs.writeFile(filepath, content, UTF8_ENCODING);
}

//
// Append content to a file.
//
export async function appendFile(filepath: string, content: string) {
  await fs.appendFile(filepath, content, UTF8_ENCODING);
}

/**
 * Get the handle of the files in a directory
 */
export async function readDirContents(dirpath: string) {
  return fs.readdir(dirpath, { withFileTypes: true });
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

//
// Deletes all files and folders in a directory, except for a file named `.gitignore`.
//
export async function clearDirectory(dirPath: string) {
  try {
    const files = await fs.readdir(dirPath);
    const jobs = files
      .filter(file => file !== ".gitignore")
      .map(async file => {
        const filePath = path.join(dirPath, file);
        return (async () => {
          try {
            await fs.rm(filePath, { recursive: true, force: true });
          } catch (error: unknown) {
            logErrorMsgAndDetail(`When clearing a directory, unable to remove the file: ${filePath}`, error);
          }
        })();
    });    
    await Promise.all(jobs);
  } catch (error: unknown) {
    logErrorMsgAndDetail(`Unable to recursively clear contents of directory: ${dirPath}`, error);
  }

  await fs.mkdir(dirPath, { recursive: true });  
}

/**
 * For the text content of a file as a template string and replaces a specific variables with
 */
export function transformJSToTSFilePath(jsSrcPath: string, localFolderName: string, localFileName: string) {
  const filepath = path.join(jsSrcPath, localFolderName, localFileName);
  return filepath.replace(appConst.DIST_FOLDER_NAME, appConst.SRC_FOLDER_NAME);
}  