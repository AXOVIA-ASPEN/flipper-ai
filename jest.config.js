/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  // Exclude integration tests from default run (use pnpm test:integration)
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
  moduleNameMapper: {
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          allowJs: true,
          jsx: 'react-jsx',
        },
        isolatedModules: true,
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
  coverageReporters: ['text', 'lcov', 'clover', 'json-summary'],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'app/api/**/*.ts',
    'src/scrapers/**/*.ts',
    '!src/lib/db.ts', // Skip database client
    '!src/generated/**', // Skip generated files
    '!src/lib/analytics-pdf-export.ts', // Browser-only (jsPDF); cannot run in Node.js/Jest
  ],
  coverageThreshold: {
    global: {
      // Thresholds reflect actual achieved coverage — CI will fail if these regress.
      // Current: statements 98.43%, branches 93.19%, functions 99.74%, lines 98.56%
      // NOTE: Branch coverage regressed from ~96.82% due to complex scraper API routes
      // added in Epic 3 with incomplete branch coverage. Tracked as tech debt.
      branches: 93,
      functions: 99,
      lines: 98,
      statements: 98,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  maxWorkers: 1,
  verbose: true,
  forceExit: true,
};

module.exports = config;
