// Jest test setup file

// Mock playwright globally to prevent browser download/launch hangs
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForSelector: jest.fn(),
          evaluate: jest.fn(),
          close: jest.fn(),
          $$eval: jest.fn().mockResolvedValue([]),
          $eval: jest.fn(),
          waitForTimeout: jest.fn(),
          setDefaultTimeout: jest.fn(),
        }),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
  },
}));

// Mock ESM-only modules that Jest can't transform
jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({})),
}));

jest.mock('next-auth', () => {
  const fn: any = jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));
  fn.default = fn;
  return fn;
});

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('next-auth/providers/github', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

// Helper: create a mock model with all common Prisma methods
function mockModel() {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
  };
}

const mockPrisma = {
  listing: mockModel(),
  searchConfig: mockModel(),
  scraperJob: mockModel(),
  opportunity: mockModel(),
  priceHistory: mockModel(),
  user: mockModel(),
  account: mockModel(),
  session: mockModel(),
  verificationToken: mockModel(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((fn: any) => typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn)),
  $queryRaw: jest.fn().mockResolvedValue([]),
  $executeRaw: jest.fn().mockResolvedValue(0),
};

// Mock Prisma/db to avoid import.meta issues
jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  Prisma: { JsonNull: null },
}));

jest.mock('@prisma/adapter-libsql', () => ({
  PrismaLibSql: jest.fn(),
}));

// Individual test files mock @/lib/db themselves if needed

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
