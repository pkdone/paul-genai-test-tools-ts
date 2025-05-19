import * as fs from 'fs/promises';
import * as path from 'path';
import { PromptBuilder, PromptLabelContentBlocks } from './prompt-builder';
import { writeFile } from '../utils/fs-utils';
import * as errorUtils from '../utils/error-utils';

// Important: This is needed to ensure these integration tests run properly
jest.setTimeout(30000);

// Mock the error-utils module to prevent console errors during tests
jest.mock('../utils/error-utils', () => {
  return {
    logErrorMsgAndDetail: jest.fn()
  };
});

describe('PromptBuilder Integration Tests', () => {
  const tempDir = path.join(__dirname, '../../temp-test');
  const testFiles = [
    {
      name: 'simple-template.prompt',
      content: 'This is a {name} template with a {value}.'
    },
    {
      name: 'complex-template.prompt',
      content: `# {title}
        
Description: {description}
        
## Features
{features}
        
## Context
{context}
        
## Additional Notes
{notes}`
    },
    {
      name: 'missing-token.prompt',
      content: 'This template has a {token} but will also reference {missing}.'
    }
  ];

  // Create test files before tests
  beforeAll(async () => {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create test files
    for (const file of testFiles) {
      await writeFile(path.join(tempDir, file.name), file.content);
    }
  });

  // Clean up test files after tests
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should replace tokens in a simple template', async () => {
    // Arrange
    const promptBuilder = new PromptBuilder();
    const filePath = path.join(tempDir, 'simple-template.prompt');
    const replacements: PromptLabelContentBlocks = [
      { label: 'name', content: 'basic' },
      { label: 'value', content: 'replacement value' }
    ];
    
    // Act
    const result = await promptBuilder.buildPrompt(filePath, replacements);
    
    // Assert
    expect(result).toBe('This is a basic template with a replacement value.');
  });

  it('should replace tokens in a complex template', async () => {
    // Arrange
    const promptBuilder = new PromptBuilder();
    const filePath = path.join(tempDir, 'complex-template.prompt');
    const replacements: PromptLabelContentBlocks = [
      { label: 'title', content: 'Project Documentation' },
      { label: 'description', content: 'This is a comprehensive project documentation.' },
      { label: 'features', content: '- Feature 1\n- Feature 2\n- Feature 3' },
      { label: 'context', content: 'This project is used for demonstration purposes.' },
      { label: 'notes', content: 'No additional notes.' }
    ];
    
    // Act
    const result = await promptBuilder.buildPrompt(filePath, replacements);
    
    // Assert
    expect(result).toContain('# Project Documentation');
    expect(result).toContain('Description: This is a comprehensive project documentation.');
    expect(result).toContain('- Feature 1\n- Feature 2\n- Feature 3');
    expect(result).toContain('This project is used for demonstration purposes.');
    expect(result).toContain('No additional notes.');
  });

  it('should handle missing tokens gracefully', async () => {
    // Arrange
    const promptBuilder = new PromptBuilder();
    const filePath = path.join(tempDir, 'missing-token.prompt');
    const replacements: PromptLabelContentBlocks = [
      { label: 'token', content: 'replaced token' }
      // Deliberately not providing a replacement for {missing}
    ];
    
    // Act
    const result = await promptBuilder.buildPrompt(filePath, replacements);
    
    // Assert
    expect(result).toBe('This template has a replaced token but will also reference {missing}.');
  });

  it('should use cache for subsequent requests for the same file', async () => {
    // Arrange
    const promptBuilder = new PromptBuilder();
    const filePath = path.join(tempDir, 'simple-template.prompt');
    const replacements: PromptLabelContentBlocks = [
      { label: 'name', content: 'cached' },
      { label: 'value', content: 'result' }
    ];

    // Instead of spying on fs.readFile, we'll modify the file between calls
    // First call - file has original content
    const result1 = await promptBuilder.buildPrompt(filePath, replacements);
    
    // Modify the file content
    await fs.writeFile(filePath, 'Modified content that should not be read', 'utf8');
    
    // Second call should use cache and not read the modified file
    const result2 = await promptBuilder.buildPrompt(filePath, replacements);
    
    // Assert - results should be identical despite file content change
    expect(result1).toBe('This is a cached template with a result.');
    expect(result2).toBe('This is a cached template with a result.');
  });

  it('should throw error when template file does not exist', async () => {
    // Arrange
    const promptBuilder = new PromptBuilder();
    const nonExistentFilePath = path.join(tempDir, 'non-existent-file.prompt');
    const replacements: PromptLabelContentBlocks = [
      { label: 'name', content: 'test' }
    ];
    
    // Act & Assert
    await expect(
      promptBuilder.buildPrompt(nonExistentFilePath, replacements)
    ).rejects.toThrow();
    
    // Verify the error was logged properly - the function was called
    expect(errorUtils.logErrorMsgAndDetail).toHaveBeenCalled();
    
    // Get the actual arguments that were passed to the mock
    const calls = (errorUtils.logErrorMsgAndDetail as jest.Mock).mock.calls;
    expect(calls.length).toBe(1);
    
    // Check that the first argument contains the expected text
    const firstArg = calls[0][0]; 
    expect(firstArg).toContain('Failed to load prompt file contents');
    
    // Check that the second argument is error-like
    const secondArg = calls[0][1];
    expect(secondArg).toBeTruthy();
    // Verify it's an object with a message property or has a string representation
    expect(typeof secondArg === 'object' && secondArg !== null).toBe(true);
    
    // Since we can't guarantee the exact type, just check if it's error-related
    // using a safe way to convert to string
    const errorString = String(secondArg);
    expect(errorString).toContain('Error');
  });
});
