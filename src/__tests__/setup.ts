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

// Mock Firebase Admin SDK (server-side only, cannot run in test env)
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn().mockReturnValue({ name: '[DEFAULT]' }),
  getApps: jest.fn().mockReturnValue([]),
  cert: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
    verifySessionCookie: jest.fn(),
    createSessionCookie: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  }),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn().mockReturnValue({
    bucket: jest.fn().mockReturnValue({
      name: 'axovia-flipper.firebasestorage.app',
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
      getFiles: jest.fn().mockResolvedValue([[]]),
    }),
  }),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendEach: jest.fn().mockResolvedValue({ responses: [], successCount: 0, failureCount: 0 }),
  }),
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
  aiAnalysisCache: mockModel(),
  listingImage: mockModel(),
  notification: mockModel(),
  flipTransaction: mockModel(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((fn: any) => (typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn))),
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
