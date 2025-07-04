import { promises as fs, Dirent } from "fs";
import path from "path";
import { logErrorMsgAndDetail } from "./error-utils";
const UTF8_ENCODING = "utf8";

/**
 * Read content from a file
 */
export async function readFile(filepath: string): Promise<string> {
  return fs.readFile(filepath, UTF8_ENCODING);
}

/**
 * Write content to a file.
 */
export async function writeFile(filepath: string, content: string): Promise<void> {
  await fs.writeFile(filepath, content, UTF8_ENCODING);
}

/**
 * Append content to a file.
 */
export async function appendFile(filepath: string, content: string): Promise<void> {
  await fs.appendFile(filepath, content, UTF8_ENCODING);
}

/**
 * Get the handle of the files in a directory
 */
export async function readDirContents(dirpath: string): Promise<Dirent[]> {
  return fs.readdir(dirpath, { withFileTypes: true });
}

/**
 * Deletes all files and folders in a directory, except for a file named `.gitignore`.
 */
export async function clearDirectory(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    const removalPromises = files
      .filter((file) => file !== ".gitignore")
      .map(async (file) => {
        const filePath = path.join(dirPath, file);
        try {
          await fs.rm(filePath, { recursive: true, force: true });
        } catch (error: unknown) {
          logErrorMsgAndDetail(
            `When clearing directory '${dirPath}', unable to remove the item: ${filePath}`,
            error,
          );
        }
      });

    await Promise.allSettled(removalPromises);
  } catch (error: unknown) {
    logErrorMsgAndDetail(`Unable to read directory for clearing: ${dirPath}`, error);
  }

  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (mkdirError: unknown) {
    logErrorMsgAndDetail(
      `Failed to ensure directory exists after clearing: ${dirPath}`,
      mkdirError,
    );
  }
}

/**
 * Reads the contents of a file and returns an array of lines, filtering out blank lines and lines
 * starting with #.
 */
export async function getTextLines(filePath: string): Promise<string[]> {
  const fileContents = await readFile(filePath);
  const lines = fileContents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return lines;
}

/**
 * Build the list of files descending from a directory
 */
export async function buildDirDescendingListOfFiles(
  srcDirPath: string,
  folderIgnoreList: readonly string[],
  filenameIgnorePrefix: string,
): Promise<string[]> {
  const files: string[] = [];
  const queue: string[] = [srcDirPath];

  while (queue.length) {
    const directory = queue.pop();
    if (!directory) continue;

    try {
      const entries = await readDirContents(directory);

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!folderIgnoreList.includes(entry.name)) {
            queue.push(fullPath);
          }
        } else if (entry.isFile()) {
          if (!entry.name.toLowerCase().startsWith(filenameIgnorePrefix)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to read directory: ${directory}`, error);
    }
  }

  return files;
}
