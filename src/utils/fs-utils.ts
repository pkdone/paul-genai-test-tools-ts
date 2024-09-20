import { promises as fs } from "fs";
import path from "path";
import { getErrorText, getErrorStack } from "./error-utils";
const UTF8_ENCODING = "utf8";


/**
 * Read content from a file
 */
export async function readFile(filepath: string) {
  return await fs.readFile(filepath, UTF8_ENCODING);
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
  return await fs.readdir(dirpath, { withFileTypes: true });
}


/**
 * Returns the suffix of a filename from a full file path.
 */
export function getFileSuffix(filepath: string) {
  let baseName = path.basename(filepath);
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
    const jobs = [];

    for (const file of files) {
      if (file !== ".gitignore") {
        const filePath = path.join(dirPath, file);
        jobs.push((async () => {
          try {
            await fs.rm(filePath, { recursive: true, force: true });
          } catch (error: unknown) {
            if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
              console.error(`When clearing a directory, unable to remove the file: ${filePath}`, getErrorText(error), getErrorStack(error));    
            }
          }
        })());
      }
    }

    await Promise.all(jobs);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
      console.error(`Unable to recursively clear contents of directory: ${dirPath}`, error, error.stack);
    }
  }

  await fs.mkdir(dirPath, { recursive: true });  
}
