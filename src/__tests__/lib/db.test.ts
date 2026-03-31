const prismaPgMock = jest.fn();
const prismaClientMock = jest.fn();

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn((args: { connectionString: string }) => {
    prismaPgMock(args);
    return { __adapter: true, connectionString: args.connectionString };
  }),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn((options: { adapter: unknown }) => {
    prismaClientMock(options);
    return { user: {} };
  }),
}));

const originalDatabaseUrl = process.env.DATABASE_URL;

function resetGlobalPrisma() {
  delete (globalThis as { prisma?: unknown }).prisma;
}

describe('Database client configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    prismaPgMock.mockClear();
    prismaClientMock.mockClear();
    resetGlobalPrisma();
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('uses DATABASE_URL when provided', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

    let db: { default: Record<string, unknown> } | undefined;
    jest.isolateModules(() => {
      db = require('@/lib/db');
    });

    // Trigger lazy initialization by accessing a property
    void db!.default.user;

    expect(prismaPgMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: 'postgresql://user:pass@localhost:5432/testdb' })
    );
  });

  it('throws when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;

    let db: { default: Record<string, unknown> } | undefined;
    jest.isolateModules(() => {
      db = require('@/lib/db');
    });

    // Client is lazily created — the throw happens on first property access
    expect(() => {
      void db!.default.user;
    }).toThrow('DATABASE_URL environment variable is not set');
  });
});
