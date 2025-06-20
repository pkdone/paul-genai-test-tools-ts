import "reflect-metadata";
import { PromptBuilder, PromptLabelContentBlocks } from './prompt-builder';
import * as fsUtils from '../utils/fs-utils';
import * as errorUtils from '../utils/error-utils';

// Mock the fs-utils module
jest.mock('../utils/fs-utils', () => {
  return {
    readFile: jest.fn()
  };
});

// Mock the error-utils module
jest.mock('../utils/error-utils', () => {
  return {
    logErrorMsgAndDetail: jest.fn()
  };
});

describe('PromptBuilder Unit Tests', () => {
  let promptBuilder: PromptBuilder;
  
  beforeEach(() => {
    promptBuilder = new PromptBuilder();
    jest.clearAllMocks();
  });
  
  describe('buildPrompt', () => {
    it('should replace all tokens in the template', async () => {
      // Arrange
      const mockTemplate = 'Hello {name}, welcome to {place}!';
      const mockPath = '/path/to/mock/template.prompt';
      const replacements: PromptLabelContentBlocks = [
        { label: 'name', content: 'User' },
        { label: 'place', content: 'TestWorld' }
      ];
      
      // Mock the file read
      (fsUtils.readFile as jest.Mock).mockResolvedValue(mockTemplate);
      
      // Act
      const result = await promptBuilder.buildPrompt(mockPath, replacements);
      
      // Assert
      expect(result).toBe('Hello User, welcome to TestWorld!');
      expect(fsUtils.readFile).toHaveBeenCalledWith(mockPath);
    });
    
    it('should handle multiple occurrences of the same token', async () => {
      // Arrange
      const mockTemplate = '{greeting}, {name}! {greeting} again, {name}!';
      const mockPath = '/path/to/mock/template.prompt';
      const replacements: PromptLabelContentBlocks = [
        { label: 'greeting', content: 'Hello' },
        { label: 'name', content: 'World' }
      ];
      
      // Mock the file read
      (fsUtils.readFile as jest.Mock).mockResolvedValue(mockTemplate);
      
      // Act
      const result = await promptBuilder.buildPrompt(mockPath, replacements);
      
      // Assert
      expect(result).toBe('Hello, World! Hello again, World!');
    });
    
    it('should warn when tokens are not found', async () => {
      // Arrange
      const mockTemplate = 'Hello {name}!';
      const mockPath = '/path/to/mock/template.prompt';
      const replacements: PromptLabelContentBlocks = [
        { label: 'name', content: 'User' },
        { label: 'unused', content: 'Not used' }
      ];
      
      // Mock the file read
      (fsUtils.readFile as jest.Mock).mockResolvedValue(mockTemplate);
      
      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Act
      const result = await promptBuilder.buildPrompt(mockPath, replacements);
      
      // Assert
      expect(result).toBe('Hello User!');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No replacements found for label "{unused}"')
      );
      
      warnSpy.mockRestore();
    });
    
    it('should return empty string when template is undefined', async () => {
      // Arrange
      const mockPath = '/path/to/mock/template.prompt';
      const replacements: PromptLabelContentBlocks = [
        { label: 'name', content: 'User' }
      ];
      
      // Mock the file read to return undefined
      (fsUtils.readFile as jest.Mock).mockResolvedValue(undefined);
      
      // Act
      const result = await promptBuilder.buildPrompt(mockPath, replacements);
      
      // Assert
      expect(result).toBe('');
    });
    
    it('should handle file read errors', async () => {
      // Arrange
      const mockPath = '/path/to/mock/template.prompt';
      const replacements: PromptLabelContentBlocks = [
        { label: 'name', content: 'User' }
      ];
      
      // Mock the file read to throw an error
      const mockError = new Error('File not found');
      (fsUtils.readFile as jest.Mock).mockRejectedValue(mockError);
      
      // Act & Assert
      await expect(promptBuilder.buildPrompt(mockPath, replacements)).rejects.toThrow(mockError);
      expect(errorUtils.logErrorMsgAndDetail).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load prompt file contents'),
        mockError
      );
    });
    
    it('should use cache for repeated calls with the same file path', async () => {
      // Arrange
      const mockTemplate = 'Hello {name}!';
      const mockPath = '/path/to/mock/template.prompt';
      const replacements: PromptLabelContentBlocks = [
        { label: 'name', content: 'User' }
      ];
      
      // Mock the file read
      (fsUtils.readFile as jest.Mock).mockResolvedValue(mockTemplate);
      
      // Act
      await promptBuilder.buildPrompt(mockPath, replacements);
      await promptBuilder.buildPrompt(mockPath, replacements);
      
      // Assert
      expect(fsUtils.readFile).toHaveBeenCalledTimes(1); // Should only be called once
    });
  });
});
