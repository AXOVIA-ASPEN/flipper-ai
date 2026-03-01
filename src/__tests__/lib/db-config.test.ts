const mockPrismaClient = jest.fn().mockImplementation(() => ({
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));

const mockPrismaPg = jest.fn().mockImplementation((opts) => ({
  ...opts,
  _type: 'PrismaPg',
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient,
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: mockPrismaPg,
}));

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockPrismaClient.mockClear();
    mockPrismaPg.mockClear();
    // Clear the global singleton so createPrismaClient runs fresh
    const g = globalThis as unknown as { prisma?: unknown };
    delete g.prisma;
    process.env = { ...originalEnv, DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw if DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    expect(() => require('../../lib/db')).toThrow('DATABASE_URL environment variable is not set');
  });

  it('should create PrismaPg adapter with correct pool settings and pass to PrismaClient', () => {
    require('../../lib/db');

    // Verify adapter created with correct pool config
    expect(mockPrismaPg).toHaveBeenCalledTimes(1);
    const adapterConfig = mockPrismaPg.mock.calls[0][0];
    expect(adapterConfig.connectionString).toBe('postgresql://test:test@localhost:5432/testdb');
    // db-f1-micro: 25 max - 5 reserved = 20 / 10 instances = 2
    expect(adapterConfig.max).toBe(2);
    expect(adapterConfig.connectionTimeoutMillis).toBe(10_000);
    expect(adapterConfig.idleTimeoutMillis).toBe(30_000);

    // Verify PrismaClient receives the adapter
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
    expect(mockPrismaClient).toHaveBeenCalledWith(
      expect.objectContaining({
        adapter: expect.objectContaining({ _type: 'PrismaPg' }),
      })
    );
  });
});
