module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Override the default test match
  testPathIgnorePatterns: [
    '/node_modules/',        // Keep the default ignore
    '<rootDir>/dist/',       // Ignore the dist folder
    '\\.int\\.test\\.ts$',   // Skip every file whose name ends with ".int.test.ts"
  ],  
};
