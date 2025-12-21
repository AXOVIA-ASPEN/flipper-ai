// Jest test setup file

// Extend Jest matchers if needed
import '@testing-library/jest-dom';

// Mock environment variables if needed
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
