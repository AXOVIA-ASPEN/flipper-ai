/** @type {import('jest').Config} */
const baseConfig = require('./jest.config');

const config = {
  ...baseConfig,
  // Only run integration tests
  testMatch: ['**/__tests__/integration/**/*.integration.test.ts'],
  // Exclude from base testPathIgnorePatterns
  testPathIgnorePatterns: [],
  // Longer timeout for database operations
  testTimeout: 30000,
  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,
  // Use both the base setup (for ESM mocks) and integration-specific setup
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/integration/setup.ts',
  ],
  // Set test database URL
  globalSetup: undefined,
  globalTeardown: undefined,
  // Transform ESM-only packages including next-auth, @auth/core, and Prisma
  transformIgnorePatterns: [
    '/node_modules/(?!(@auth/prisma-adapter|@auth/core|next-auth|@prisma/adapter-libsql|@libsql)/)'],
  // Use experimental ESM support for import.meta
  extensionsToTreatAsEsm: [],
};

module.exports = config;
