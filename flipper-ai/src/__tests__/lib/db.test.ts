const prismaLibSqlMock = jest.fn();
const prismaClientMock = jest.fn();

jest.mock("@prisma/adapter-libsql", () => ({
  PrismaLibSql: jest.fn((args: { url: string }) => {
    prismaLibSqlMock(args);
    return { __adapter: true, url: args.url };
  }),
}));

jest.mock("@/generated/prisma/client", () => ({
  PrismaClient: jest.fn((options: { adapter: unknown }) => {
    prismaClientMock(options);
    return {};
  }),
}));

const originalDatabaseUrl = process.env.DATABASE_URL;

function resetGlobalPrisma() {
  delete (globalThis as { prisma?: unknown }).prisma;
}

describe("Database client configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    prismaLibSqlMock.mockClear();
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

  it("uses DATABASE_URL when provided", () => {
    process.env.DATABASE_URL = "file:./custom.db";

    jest.isolateModules(() => {
      require("@/lib/db");
    });

    expect(prismaLibSqlMock).toHaveBeenCalledWith({ url: "file:./custom.db" });
  });

  it("falls back to the default database path", () => {
    delete process.env.DATABASE_URL;

    jest.isolateModules(() => {
      require("@/lib/db");
    });

    expect(prismaLibSqlMock).toHaveBeenCalledWith({ url: "file:./dev.db" });
  });
});
