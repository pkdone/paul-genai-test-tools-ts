import { readFile } from "../utils/fs-utils";

/*
 * This module provides a class for building prompts from templates with expanded variables.
 */
export interface PromptLabelContentBlock {
  label: string;
  content: string;
}

/*
 * This is an array of objects where each object has two keys, 'label' and 'content', where the
 * value for each is a string.
 */
export type PromptLabelContentBlocks = PromptLabelContentBlock[];

/*
 * Class for building a prompt from a template with expanded vairables.
 */
export class PromptBuilder {
  // Private fields
  private readonly promptFileCache = new Map<string, Promise<string>>();

  /*
   * Construct a prompt from a template and the provided data.
   *
   * 'contentToReplaceList' is an array of object where each object has two keys, 'label' and
   *'content', where the value for each is a string.
   */
  async buildPrompt(promptFilePath: string, contentToReplaceList: PromptLabelContentBlocks) {
    const promptTemplate = await this.getPromptFileContents(promptFilePath);
    return this.generatePromptFromFilledOutTemplate(promptFilePath, promptTemplate, contentToReplaceList);
  }

  //
  // Get prompt file, retrieving from memory cache if it's not already present, otherwise load
  // from disk and add to cache.
  // Internally this stores a promise for against the filepath key to enable concurrency.
  //
  private async getPromptFileContents(promptFilePath: string) {
    if (this.promptFileCache.has(promptFilePath)) {
      return await this.promptFileCache.get(promptFilePath);
    }
  
    const fileContentPromise = readFile(promptFilePath);
    this.promptFileCache.set(promptFilePath, fileContentPromise);
  
    try {
      const content = await fileContentPromise;
      this.promptFileCache.set(promptFilePath, Promise.resolve(content)); 
      return content;
    } catch (error) {
      this.promptFileCache.delete(promptFilePath);
      console.error("Unable to load prompt file contents", error);    
      throw error;
    } 
  }


  /*
   * For the text content of a file as a template string and replaces a specific variables with  
   * pieces of content.
   *
   * 'contentToReplaceList' is an array of object where each object has two keys, 'label' and
   *'content', where the value for each is a string.
   */
  private generatePromptFromFilledOutTemplate(templateReference: string, promptTemplate: string | undefined, 
                                              contentToReplaceList: PromptLabelContentBlocks) {
    if (!promptTemplate) return "";                                        
    let replacedText = promptTemplate;

    for (const item of contentToReplaceList) {
      const { label, content } = item;
      const wrappedLabel = `{${label}}`;
      const regex = new RegExp(wrappedLabel, "g");

      if (replacedText.includes(wrappedLabel)) {
        replacedText = replacedText.replace(regex, content);
      } else {
        console.warn(`Warning: No replacements found for label "${wrappedLabel}" in template "${templateReference}".`);
      }
    }

    return replacedText;
  }
}
