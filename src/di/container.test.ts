import { DIContainer } from './container';
import { ServiceRunnerConfig } from '../types/service.types';

describe('DIContainer Singleton Behavior', () => {
  let diContainer: DIContainer;
  
  beforeEach(() => {
    // Get a fresh instance for each test
    diContainer = DIContainer.getInstance();
    // Reset the registration state to ensure clean test environment
    diContainer.resetRegistrationState();
  });
  
  describe('singleton behavior', () => {
    it('should maintain singleton instance across multiple calls', () => {
      const instance1 = DIContainer.getInstance();
      const instance2 = DIContainer.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should track registration state correctly', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      // First registration
      await diContainer.registerDependencies(config);
      
      // Check that basic services are registered
      expect(diContainer.isRegistered('services')).toBe(true);
      expect(diContainer.isRegistered('llmDependencies')).toBe(false);
      expect(diContainer.isRegistered('mongoDBDependencies')).toBe(false);
    });
    
    it('should not re-register dependencies on subsequent calls', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      // Spy on console.log to verify logging behavior
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // First registration
      await diContainer.registerDependencies(config);
      
      // Second registration - should skip already registered dependencies
      await diContainer.registerDependencies(config);
      
      // Verify that "skipping registration" messages appear
      const skipMessages = consoleSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('already registered') && call[0].includes('skipping')
      );
      
      expect(skipMessages.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
    
    it('should handle different environment configurations', async () => {
      const configWithoutLLM: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      // Register without LLM first
      await diContainer.registerDependencies(configWithoutLLM);
      expect(diContainer.isRegistered('envDependencies', 'llm:false')).toBe(true);
      expect(diContainer.isRegistered('llmDependencies')).toBe(false);
      
      // Verify that LLM dependencies are not registered yet
      expect(diContainer.isRegistered('envDependencies', 'llm:true')).toBe(false);
    });
    
    it('should provide reset functionality for testing', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      // Register some dependencies
      await diContainer.registerDependencies(config);
      expect(diContainer.isRegistered('services')).toBe(true);
      
      // Reset and verify state is cleared
      diContainer.resetRegistrationState();
      expect(diContainer.isRegistered('services')).toBe(false);
      expect(diContainer.isRegistered('llmDependencies')).toBe(false);
      expect(diContainer.isRegistered('mongoDBDependencies')).toBe(false);
    });
  });
  
  describe('registration state tracking', () => {
    it('should correctly identify registered dependency groups', () => {
      // Initially nothing should be registered
      expect(diContainer.isRegistered('services')).toBe(false);
      expect(diContainer.isRegistered('llmDependencies')).toBe(false);
      expect(diContainer.isRegistered('mongoDBDependencies')).toBe(false);
      expect(diContainer.isRegistered('envDependencies', 'llm:false')).toBe(false);
      expect(diContainer.isRegistered('envDependencies', 'llm:true')).toBe(false);
    });
  });
}); 