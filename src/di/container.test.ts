import { registerDependencies, container } from './container';
import { ServiceRunnerConfig } from '../types/service.types';
import { TOKENS } from './tokens';

// Mock the LLM-related modules to avoid environment dependencies in tests
jest.mock('../llm/llm-service');
jest.mock('../llm/llm-router');
jest.mock('../mdb/mdb-client-factory', () => ({
  MongoDBClientFactory: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      db: () => ({
        collection: () => ({
          find: () => ({
            map: () => ({ toArray: () => [] })
          })
        })
      })
    })
  }))
}));

describe('Dependency Registration', () => {
  
  beforeEach(() => {
    // Clear the container before each test
    container.clearInstances();
    
    // Mock environment variables
    process.env.MONGODB_URL = 'mongodb://test:27017/test';
    process.env.CODEBASE_DIR_PATH = '/test/path';
  });
  
  describe('registerDependencies function', () => {
    it('should register basic dependencies without LLM or MongoDB', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      await registerDependencies(config);
      
      // Verify that environment variables and services are registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.CodebaseQueryService)).toBe(true);
      expect(container.isRegistered(TOKENS.InsightsFromDBGenerationService)).toBe(true);
      
      // Verify that LLM and MongoDB dependencies are not registered
      expect(container.isRegistered(TOKENS.LLMService)).toBe(false);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);
    });
    
    it('should register MongoDB dependencies when required', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      await registerDependencies(config);
      
      // Verify that MongoDB dependencies are registered along with basic dependencies
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoClient)).toBe(true);
      expect(container.isRegistered(TOKENS.CodebaseQueryService)).toBe(true);
      
      // Verify that LLM dependencies are not registered
      expect(container.isRegistered(TOKENS.LLMService)).toBe(false);
    });
    
    it('should handle multiple calls without errors (idempotent)', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      // First registration
      await registerDependencies(config);
      
      // Second registration should not throw errors
      await expect(registerDependencies(config)).resolves.not.toThrow();
      
      // Dependencies should still be registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.CodebaseQueryService)).toBe(true);
    });
    
    it('should handle multiple calls with MongoDB without errors', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      // First registration
      await registerDependencies(config);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      
      // Second registration should not throw errors
      await expect(registerDependencies(config)).resolves.not.toThrow();
      
      // Dependencies should still be registered
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoClient)).toBe(true);
    });
  });
  
  describe('tsyringe singleton behavior', () => {
    it('should provide access to registered environment variables', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      await registerDependencies(config);
      
      // Should be able to resolve environment variables
      const envVars = container.resolve(TOKENS.EnvVars);
      
      expect(envVars).toBeDefined();
      expect(envVars).toHaveProperty('CODEBASE_DIR_PATH');
    });
    
    it('should resolve MongoDB dependencies when registered', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      await registerDependencies(config);
      
      // Should be able to resolve MongoDB dependencies
      const mongoFactory = container.resolve(TOKENS.MongoDBClientFactory);
      const mongoClient = container.resolve(TOKENS.MongoClient);
      
      expect(mongoFactory).toBeDefined();
      expect(mongoClient).toBeDefined();
    });
    
    it('should resolve MongoDB-dependent services when all dependencies are registered', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      await registerDependencies(config);
      
      // Should be able to resolve MongoDB-dependent service
      const mongoConnectionTestService = container.resolve(TOKENS.MDBConnectionTestService);
      
      expect(mongoConnectionTestService).toBeDefined();
    });
    
    it('should maintain singleton behavior across multiple resolutions', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      await registerDependencies(config);
      
      // Resolve the same dependencies multiple times
      const mongoFactory1 = container.resolve(TOKENS.MongoDBClientFactory);
      const mongoFactory2 = container.resolve(TOKENS.MongoDBClientFactory);
      
      // Should be the same instance due to singleton registration
      expect(mongoFactory1).toBe(mongoFactory2);
    });
    
    it('should check registration state correctly', async () => {
      // Initially nothing should be registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(false);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);
      expect(container.isRegistered(TOKENS.LLMService)).toBe(false);
      
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      await registerDependencies(config);
      
      // Check that correct dependencies are now registered
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
      expect(container.isRegistered(TOKENS.LLMService)).toBe(false);
    });
  });
  
  describe('conditional registration behavior', () => {
    it('should only register services once even with multiple registerServices calls', async () => {
      const config: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      // First registration
      await registerDependencies(config);
      expect(container.isRegistered(TOKENS.CodebaseQueryService)).toBe(true);
      
      // Second registration should not cause issues
      await registerDependencies(config);
      expect(container.isRegistered(TOKENS.CodebaseQueryService)).toBe(true);
      
      // Test that registration is idempotent - verify service tokens are registered
      expect(container.isRegistered(TOKENS.InsightsFromDBGenerationService)).toBe(true);
      expect(container.isRegistered(TOKENS.PluggableLLMsTestService)).toBe(true);
    });
    
    it('should handle mixed dependency scenarios', async () => {
      // First register without MongoDB
      const config1: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: false
      };
      
      await registerDependencies(config1);
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(false);
      
      // Then register with MongoDB
      const config2: ServiceRunnerConfig = {
        requiresLLM: false,
        requiresMongoDB: true
      };
      
      await registerDependencies(config2);
      expect(container.isRegistered(TOKENS.EnvVars)).toBe(true);
      expect(container.isRegistered(TOKENS.MongoDBClientFactory)).toBe(true);
    });
  });
}); 